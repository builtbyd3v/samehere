"use server";

import { createClient } from "@/lib/supabase/server";
import { aiEnabled, generateText, modelForTier } from "@/lib/ai";
import { JOB_FIT_SYSTEM, JOB_PITCH_SYSTEM, untrusted } from "@/lib/ai-prompts";
import { isPro } from "@/lib/pro";

type ListingRow = {
  id: string;
  org: string;
  title: string;
  kind: string;
  locations: string | null;
  term: string | null;
  url: string;
  posted_at: string | null;
};

type ExpRow = { kind: string; org: string; role: string; term: string | null };

export type JobFitResult = { id: string; reason: string; listing: ListingRow };
export type RankJobsState = { results?: JobFitResult[]; overCap?: boolean; empty?: boolean; error?: string };

const POOL = 40;
const LISTING_SELECT = "id, org, title, kind, locations, term, url, posted_at";

// id stays outside the wrap (uuid, DB-authored, not user text). org/title/term
// are listing data (not user-authored either, but ingested from third parties)
// -- wrapped anyway since it flows into the same prompt as untrusted profile text.
function compactListing(l: ListingRow): string {
  const data = [l.org, l.title, l.term ? `(${l.term})` : ""].filter(Boolean).join(" — ");
  return `id=${l.id} ${untrusted(data)}`;
}

function parseRanked(raw: string | null, pool: ListingRow[]): JobFitResult[] {
  if (!raw) return [];
  const byId = new Map(pool.map((l) => [l.id, l]));
  let arr: unknown;
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    arr = JSON.parse(cleaned);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const out: JobFitResult[] = [];
  const used = new Set<string>();
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const id = (item as { id?: unknown }).id;
    const reason = (item as { reason?: unknown }).reason;
    if (typeof id !== "string" || typeof reason !== "string") continue;
    const listing = byId.get(id);
    if (!listing || used.has(id)) continue;
    used.add(id);
    out.push({ id, reason: reason.slice(0, 200), listing });
    if (out.length >= 10) break;
  }
  return out;
}

// AI fit-rank: LLM-reranks up to 40 recent active listings against the viewer's
// own profile + experience. Free 3/day, Pro 150/day (use_ai_quota). Results are
// cached into job_fit so the page can render them again without another AI call.
export async function rankJobs(): Promise<RankJobsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: viewer } = await supabase
    .from("profiles")
    .select("is_pro, pro_until, year, major, goals, bio")
    .eq("id", user.id)
    .single();
  const pro = isPro(viewer ?? { is_pro: false, pro_until: null });

  const { data: listings } = await supabase
    .from("job_listings")
    .select(LISTING_SELECT)
    .eq("active", true)
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(POOL)
    .returns<ListingRow[]>();
  const pool = listings ?? [];
  if (pool.length === 0) return { empty: true };

  if (!aiEnabled()) return { error: "Matching is temporarily unavailable." };

  const { data: allowed } = await supabase.rpc("use_ai_quota", { p_kind: "job_fit" });
  if (!allowed) return { overCap: true };

  const { data: exp } = await supabase
    .from("experiences")
    .select("kind, org, role, term")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<ExpRow[]>();

  const facts = [
    viewer?.year ? `year: ${untrusted(String(viewer.year))}` : null,
    viewer?.major ? `major: ${untrusted(viewer.major)}` : null,
    viewer?.goals ? `goals: ${untrusted(viewer.goals.slice(0, 200))}` : null,
    viewer?.bio ? `bio: ${untrusted(viewer.bio.slice(0, 200))}` : null,
    ...(exp ?? []).map(
      (e) => `experience: ${untrusted(`${e.kind} @ ${e.org} — ${e.role}${e.term ? ` (${e.term})` : ""}`.slice(0, 160))}`,
    ),
  ]
    .filter(Boolean)
    .join("; ");

  const list = pool.map(compactListing).join("\n");
  const raw = await generateText(
    JOB_FIT_SYSTEM,
    `Student: ${facts || "no profile facts available"}\n\nListings:\n${list}`,
    { model: modelForTier(pro), maxTokens: 500, temperature: 0.2 },
  );

  const ranked = parseRanked(raw, pool);
  if (ranked.length === 0) return { results: [] };

  await supabase
    .from("job_fit")
    .upsert(ranked.map((r) => ({ user_id: user.id, listing_id: r.id, reason: r.reason })));

  return { results: ranked };
}

export type PitchResult = { locked: true } | { text: string } | { error: true };

// Pro-only tailored pitch for one listing. Cache-first (job_pitches); telemetry
// only through use_ai_quota (the isPro check below is the real gate, same
// pattern as improvePost in feed/actions.ts).
export async function tailorPitch(listingId: string): Promise<PitchResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: true };

  const { data: viewer } = await supabase
    .from("profiles")
    .select("is_pro, pro_until, year, major, goals, bio")
    .eq("id", user.id)
    .single();
  if (!isPro(viewer ?? { is_pro: false, pro_until: null })) return { locked: true };

  const { data: cached } = await supabase
    .from("job_pitches")
    .select("pitch")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();
  if (cached?.pitch) return { text: cached.pitch };

  const { data: listing } = await supabase
    .from("job_listings")
    .select(LISTING_SELECT)
    .eq("id", listingId)
    .maybeSingle<ListingRow>();
  if (!listing) return { error: true };

  if (!aiEnabled()) return { error: true };
  await supabase.rpc("use_ai_quota", { p_kind: "job_pitch" });

  const { data: exp } = await supabase
    .from("experiences")
    .select("kind, org, role, term")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<ExpRow[]>();

  const facts = [
    viewer?.year ? `year: ${untrusted(String(viewer.year))}` : null,
    viewer?.major ? `major: ${untrusted(viewer.major)}` : null,
    viewer?.goals ? `goals: ${untrusted(viewer.goals.slice(0, 200))}` : null,
    viewer?.bio ? `bio: ${untrusted(viewer.bio.slice(0, 200))}` : null,
    ...(exp ?? []).map(
      (e) => `experience: ${untrusted(`${e.kind} @ ${e.org} — ${e.role}${e.term ? ` (${e.term})` : ""}`.slice(0, 160))}`,
    ),
  ]
    .filter(Boolean)
    .join("; ");

  const text = await generateText(
    JOB_PITCH_SYSTEM,
    `Student: ${facts || "no profile facts available"}\n\nListing: ${untrusted(`${listing.org} — ${listing.title}${listing.term ? ` (${listing.term})` : ""}`)}`,
    { model: modelForTier(true), maxTokens: 500, temperature: 0.3 },
  );
  if (!text) return { error: true };

  await supabase.from("job_pitches").upsert({ user_id: user.id, listing_id: listingId, pitch: text });
  return { text };
}
