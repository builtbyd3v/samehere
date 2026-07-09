"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, PAGE, type FeedPost } from "@/components/feed/PostCard";
import { attachSignedMedia } from "@/lib/media";
import { aiEnabled, generateText, modelForTier, type AiResult } from "@/lib/ai";
import { COMPOSER_SYSTEM, IMPROVE_SYSTEM, PEOPLE_SEARCH_SYSTEM } from "@/lib/ai-prompts";
import { getPostHogServerClient } from "@/lib/posthog-server";
import { isPro } from "@/lib/pro";
import { TEXT_LIMITS, textLimitError } from "@/lib/utils/validation";

export type ComposerState = { error?: string; ok?: boolean };

// Next page for "Load more": posts strictly older than the cursor (created_at
// of the last row shown). Keyset pagination — no OFFSET drift as new posts
// arrive. RLS still restricts to visible posts.
export async function loadMorePosts(cursor: string): Promise<FeedPost[]> {
  const supabase = await createClient();
  // ponytail: app-side filter post-fetch, not RLS on posts — mirrors the first page in feed/page.tsx.
  const query = supabase
    .from("posts")
    .select(POST_SELECT)
    .lt("created_at", cursor)
    .order("created_at", { ascending: false })
    .limit(PAGE);

  const [{ data }, { data: blockedIds }] = await Promise.all([
    query.returns<FeedPost[]>(),
    supabase.rpc("get_blocked_ids"),
  ]);
  const blocked = new Set(blockedIds ?? []);
  const filtered = data?.filter((p) => !blocked.has(p.user_id)) ?? [];
  return await attachSignedMedia(supabase, filtered);
}

const MAX = TEXT_LIMITS.post;

// Create a post. Any non-empty content is allowed — the 150-char threshold only
// decides whether it earns a heatmap point, not whether it can be posted. Insert
// goes through the session client so RLS pins user_id to the author. The heatmap
// point is awarded by the posts_award_contribution AFTER INSERT trigger, which
// measures the row's own length — a client can no longer request a point.
export async function createPost(_prev: ComposerState, formData: FormData): Promise<ComposerState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const content = String(formData.get("content") ?? "").trim();
  if (content.length === 0) return { error: "Write something first." };
  const limitErr = textLimitError("Posts", MAX, content.length);
  if (limitErr) return { error: limitErr };

  // Media paths come from the client (already uploaded to storage) — untrusted
  // JSON, so re-validate shape + that each path is scoped to this user's folder.
  let media: { path: string; type: "image" | "video" }[] = [];
  const rawMedia = formData.get("media");
  if (typeof rawMedia === "string" && rawMedia.length > 0) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawMedia);
    } catch {
      return { error: "Invalid media." };
    }
    if (!Array.isArray(parsed) || parsed.length > 4) return { error: "Invalid media." };
    for (const item of parsed) {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as { path?: unknown }).path !== "string" ||
        !(item as { path: string }).path.startsWith(`${user.id}/`) ||
        ((item as { type?: unknown }).type !== "image" && (item as { type?: unknown }).type !== "video")
      ) {
        return { error: "Invalid media." };
      }
    }
    media = parsed as { path: string; type: "image" | "video" }[];
  }

  const { error } = await supabase.from("posts").insert({ user_id: user.id, content, media });
  if (error) return { error: "Could not publish your post. Try again." };

  const posthog = getPostHogServerClient();
  posthog?.capture({
    distinctId: user.id,
    event: "post_created",
    properties: {
      has_media: media.length > 0,
      media_count: media.length,
      character_count: content.length,
    },
  });

  revalidatePath("/feed");
  return { ok: true };
}

const NUDGE_FALLBACKS = [
  "What did you build or fix today?",
  "What are you stuck on right now?",
  "Share one thing you learned this week.",
  "What are you working toward this semester?",
  "What's a small win from today?",
];

function randomFallback(): string {
  return NUDGE_FALLBACKS[Math.floor(Math.random() * NUDGE_FALLBACKS.length)];
}

// On-demand composer writing prompt. Metered via use_ai_quota; always falls
// back to a static prompt (AI off, over quota, or call failed) so this never
// throws and always returns something usable.
// ponytail: static fallback list covers AI-off/over-quota; on-demand only, so no quota burn on render.
export async function composerNudge(): Promise<AiResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { text: randomFallback() };

  if (aiEnabled()) {
    const { data: profile } = await supabase.from("profiles").select("is_pro, pro_until").eq("id", user.id).single();
    const pro = isPro(profile ?? { is_pro: false, pro_until: null });
    const { data: allowed } = await supabase.rpc("use_ai_quota", {
      p_kind: "composer_nudge",
      p_cap: pro ? 9999 : 3,
    });
    // Free user out of quota → upsell; Pro can't realistically hit the cap.
    if (!allowed) return pro ? { text: randomFallback() } : { overCap: true };
    const text = await generateText(
      COMPOSER_SYSTEM,
      "Give me one prompt.",
      { model: modelForTier(pro) }
    );
    if (text) return { text };
  }

  return { text: randomFallback() };
}

// Pro-only: rewrite the author's OWN draft sharper. `locked` when the caller
// isn't Pro; `error` when the draft is empty, AI is off, or the call fails.
// Only ever sees the author's own draft — no other user's content is loaded.
export type ImproveResult = { locked: true } | { text: string } | { error: true };

export async function improvePost(draft: string): Promise<ImproveResult> {
  const trimmed = draft.trim();
  if (!trimmed) return { error: true };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: true };

  const { data: profile } = await supabase.from("profiles").select("is_pro, pro_until").eq("id", user.id).single();
  if (!isPro(profile ?? { is_pro: false, pro_until: null })) return { locked: true };
  if (!aiEnabled()) return { error: true };

  // Metered for telemetry; Pro's 9999 cap never blocks.
  await supabase.rpc("use_ai_quota", { p_kind: "improve_post", p_cap: 9999 });

  const text = await generateText(IMPROVE_SYSTEM, trimmed, { model: modelForTier(true), maxTokens: 512 });
  return text ? { text } : { error: true };
}

// Delete own post. RLS restricts the delete to the owner, so a non-owner's
// call affects 0 rows — safe to run through the plain session client.
// ponytail: best-effort media purge on delete; orphan sweep later if it matters.
export async function deletePost(postId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: row } = await supabase.from("posts").select("media").eq("id", postId).maybeSingle();
  const paths = ((row?.media ?? []) as { path: string }[]).map((m) => m.path);
  if (paths.length > 0) {
    await supabase.storage.from("post-media").remove(paths);
  }

  await supabase.from("posts").delete().eq("id", postId);

  revalidatePath("/feed");
}

// Natural-language people search (Pro engine). LLM-reranks a SQL-prefiltered
// candidate pool — no embeddings. Free users get 1/day; Pro is uncapped. AI
// output is untrusted: JSON parsed defensively, ids validated against the pool,
// reason rendered as plain text by the caller.
// ponytail: ilike prefilter + LLM rerank; add pgvector only if it beats this.
export type PeopleSearchResult = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
  reason: string | null;
};
export type PeopleSearchState = {
  results?: PeopleSearchResult[];
  overCap?: boolean;
  empty?: boolean;
  error?: string;
};

type Candidate = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
  year: string | null;
  major: string | null;
  skills: string[] | null;
  courses: string[] | null;
  goals: string | null;
  bio: string | null;
  profile_school: { school: string | null } | null;
};

const AI_SEARCH_POOL = 40;
const CAND_SELECT =
  "id, username, display_name, avatar_url, is_pro, is_founder, is_campus_founder, year, major, skills, courses, goals, bio, profile_school(school)";

function toResult(c: Candidate): PeopleSearchResult {
  return {
    id: c.id,
    username: c.username,
    display_name: c.display_name,
    avatar_url: c.avatar_url,
    is_pro: c.is_pro,
    is_founder: c.is_founder,
    is_campus_founder: c.is_campus_founder,
    reason: null,
  };
}

function compactCandidate(c: Candidate): string {
  return [
    `id=${c.id}`,
    `@${c.username}${c.display_name ? ` (${c.display_name})` : ""}`,
    [c.year, c.major].filter(Boolean).join(" "),
    c.profile_school?.school ? `school: ${c.profile_school.school}` : "",
    c.skills?.length ? `skills: ${c.skills.slice(0, 8).join(", ")}` : "",
    c.courses?.length ? `courses: ${c.courses.slice(0, 8).join(", ")}` : "",
    c.goals ? `goals: ${c.goals.slice(0, 120)}` : "",
    c.bio ? `bio: ${c.bio.slice(0, 120)}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

// Parse the model's JSON array defensively. Any deviation → empty (caller falls
// back to the raw prefilter pool). ids are validated against the candidate set,
// so the model can't smuggle in a profile the viewer couldn't already see.
function parseRanked(raw: string | null, candidates: Candidate[]): PeopleSearchResult[] {
  if (!raw) return [];
  const byId = new Map(candidates.map((c) => [c.id, c]));
  let arr: unknown;
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    arr = JSON.parse(cleaned);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const out: PeopleSearchResult[] = [];
  const used = new Set<string>();
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const id = (item as { id?: unknown }).id;
    const reason = (item as { reason?: unknown }).reason;
    if (typeof id !== "string") continue;
    const c = byId.get(id);
    if (!c || used.has(id)) continue;
    used.add(id);
    out.push({ ...toResult(c), reason: typeof reason === "string" ? reason.slice(0, 200) : null });
    if (out.length >= 8) break;
  }
  return out;
}

export async function peopleSearch(query: string): Promise<PeopleSearchState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const safe = query.replace(/[,()*%\\]/g, "").trim().slice(0, TEXT_LIMITS.searchQuery);
  if (!safe) return { error: "Describe who you want to meet." };

  const { data: viewer } = await supabase.from("profiles").select("is_pro, pro_until").eq("id", user.id).single();
  const pro = isPro(viewer ?? { is_pro: false, pro_until: null });

  // Prefilter: token ilike over the same fields keyword search uses, plus goals/bio.
  // Tokens are allowlist-sanitized to [a-z0-9] so nothing can escape the PostgREST
  // .or() filter grammar (safe, above, keeps punctuation only for the AI query text).
  const tokens = safe
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/gi, ""))
    .filter(Boolean)
    .slice(0, 8);
  const orFilter = tokens
    .flatMap((t) => [
      `username.ilike.%${t}%`,
      `display_name.ilike.%${t}%`,
      `major.ilike.%${t}%`,
      `skills.cs.{${t}}`,
      `courses.cs.{${t}}`,
      `goals.ilike.%${t}%`,
      `bio.ilike.%${t}%`,
    ])
    .join(",");

  const [{ data: matched }, { data: blockedIds }] = await Promise.all([
    supabase.from("profiles").select(CAND_SELECT).or(orFilter).neq("id", user.id).limit(AI_SEARCH_POOL).returns<Candidate[]>(),
    supabase.rpc("get_blocked_ids"),
  ]);
  const blocked = new Set(blockedIds ?? []);
  const candidates = (matched ?? []).filter((c) => !blocked.has(c.id));

  // Thin pool → top up with recent students so the model still has options.
  if (candidates.length < 5) {
    const { data: recent } = await supabase
      .from("profiles")
      .select(CAND_SELECT)
      .neq("id", user.id)
      .order("created_at", { ascending: false })
      .limit(AI_SEARCH_POOL)
      .returns<Candidate[]>();
    const seen = new Set(candidates.map((c) => c.id));
    for (const r of recent ?? []) {
      if (candidates.length >= AI_SEARCH_POOL) break;
      if (!blocked.has(r.id) && !seen.has(r.id)) candidates.push(r);
    }
  }

  if (candidates.length === 0) return { empty: true };

  // AI off → return the prefilter pool as-is, no quota consumed.
  if (!aiEnabled()) return { results: candidates.slice(0, 8).map(toResult) };

  const { data: allowed } = await supabase.rpc("use_ai_quota", {
    p_kind: "people_search",
    p_cap: pro ? 9999 : 1,
  });
  // Free user out of their 1/day → upsell; Pro can't realistically hit 9999.
  if (!allowed) return pro ? { results: candidates.slice(0, 8).map(toResult) } : { overCap: true };

  const list = candidates.map(compactCandidate).join("\n");
  const raw = await generateText(
    PEOPLE_SEARCH_SYSTEM,
    `Looking for: ${safe}\n\nCandidates:\n${list}`,
    { model: modelForTier(pro), maxTokens: 500 },
  );

  const ranked = parseRanked(raw, candidates);
  // Parse failed / model returned nothing usable → still show the prefilter pool.
  return { results: ranked.length ? ranked : candidates.slice(0, 8).map(toResult) };
}
