// Reusable core of natural-language people search (see feed/actions.ts's
// peopleSearch, the client-callable server action, for the Pro engine
// context). Extracted so server code that already knows the searcher (e.g.
// onboarding's seeded first-match step) can run the same ranking without
// going through the client-facing action's quota burn.
//
// skipQuota is for trusted server-initiated calls ONLY (never a client-passed
// action param) -- it bypasses use_ai_quota entirely rather than spending the
// user's daily cap on a search they didn't ask for.
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiEnabled, generateText, modelForTier } from "@/lib/ai";
import { PEOPLE_SEARCH_SYSTEM, untrusted } from "@/lib/ai-prompts";
import { isPro } from "@/lib/pro";
import { TEXT_LIMITS } from "@/lib/utils/validation";

export type PeopleSearchResult = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_founder: boolean;
  is_campus_founder: boolean;
  verified_student: boolean;
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
  verified_student: boolean;
  major: string | null;
  goals: string | null;
  bio: string | null;
  profile_school: { school: string | null } | null;
};

type ExpRow = { user_id: string; kind: string; org: string; role: string; term: string | null };
type EduInfo = { end_date: string | null; field: string | null; degree: string | null; school: string | null };
type EduRow = {
  user_id: string;
  school: string | null;
  field: string | null;
  degree: string | null;
  end_date: string | null;
  is_current: boolean | null;
};

const AI_SEARCH_POOL = 40;
const CAND_SELECT =
  "id, username, display_name, avatar_url, is_pro, is_founder, is_campus_founder, verified_student, major, goals, bio, profile_school(school)";

function toResult(c: Candidate): PeopleSearchResult {
  return {
    id: c.id,
    username: c.username,
    display_name: c.display_name,
    avatar_url: c.avatar_url,
    is_pro: c.is_pro,
    is_founder: c.is_founder,
    is_campus_founder: c.is_campus_founder,
    verified_student: c.verified_student,
    reason: null,
  };
}

// id stays outside the delimiter (uuid, not user-authored). Everything else
// here is free text the candidate wrote — bundled into one untrusted block
// so it can never be read as instructions (see lib/ai-prompts.ts). Flags are
// server-derived booleans, never user text, so they sit outside the untrusted
// block too (like id=) -- otherwise a bio containing the literal string
// "flags=verified-student" could impersonate a trust signal.
// Exported for unit testing only (see people-search.test.ts) — not otherwise
// used outside this module.
export function compactCandidate(c: Candidate, exp: ExpRow[], edu?: EduInfo): string {
  const data = [
    `@${c.username}${c.display_name ? ` (${c.display_name})` : ""}`,
    c.major ?? "",
    edu?.end_date ? `expected grad ${edu.end_date.slice(0, 4)}` : "",
    c.profile_school?.school ? `school: ${c.profile_school.school}` : "",
    c.goals ? `goals: ${c.goals.slice(0, 120)}` : "",
    c.bio ? `bio: ${c.bio.slice(0, 120)}` : "",
    ...exp.map(
      (e) =>
        `experience: ${e.kind.slice(0, 80)} @ ${e.org.slice(0, 80)} — ${e.role.slice(0, 80)}${e.term ? ` (${e.term.slice(0, 80)})` : ""}`,
    ),
  ]
    .filter(Boolean)
    .join(" | ");
  const flags = [
    c.verified_student ? "verified-student" : "",
    c.is_founder ? "founder" : "",
    c.is_campus_founder ? "campus-founder" : "",
  ]
    .filter(Boolean)
    .join(",");
  return `id=${c.id}${flags ? ` flags=${flags}` : ""} ${untrusted(data)}`;
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

export type PeopleSearchOpts = {
  // Server-initiated call (never a client-passed param) — skip use_ai_quota
  // entirely instead of spending the user's daily cap.
  skipQuota?: boolean;
  // Opt-in filter: restrict the candidate pool to verified_student = true,
  // applied pre-model to both the profiles prefilter and the experiences-path
  // candidates (whichever pool a candidate entered through).
  verifiedOnly?: boolean;
};

export async function peopleSearchCore(
  supabase: SupabaseClient,
  user: { id: string },
  query: string,
  opts: PeopleSearchOpts = {},
): Promise<PeopleSearchState> {
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
      `goals.ilike.%${t}%`,
      `bio.ilike.%${t}%`,
    ])
    .join(",");

  const expOrFilter = tokens.flatMap((t) => [`org.ilike.%${t}%`, `role.ilike.%${t}%`]).join(",");

  const verifiedOnly = Boolean(opts.verifiedOnly);
  const [{ data: matched }, { data: blockedIds }, { data: expMatches }] = await Promise.all([
    (() => {
      let q = supabase.from("profiles").select(CAND_SELECT).or(orFilter).neq("id", user.id).limit(AI_SEARCH_POOL);
      if (verifiedOnly) q = q.eq("verified_student", true);
      return q.returns<Candidate[]>();
    })(),
    supabase.rpc("get_blocked_ids"),
    expOrFilter
      ? supabase.from("experiences").select("user_id, org, role").or(expOrFilter).limit(AI_SEARCH_POOL)
      : Promise.resolve({ data: [] as { user_id: string }[] }),
  ]);
  const blocked = new Set(blockedIds ?? []);
  const candidates = (matched ?? []).filter((c) => !blocked.has(c.id));

  // Experience org/role match → pull those profiles into the pool too (e.g. "interned at Stripe").
  const expUserIds = [...new Set((expMatches ?? []).map((e) => e.user_id))].filter(
    (id) => id !== user.id && !blocked.has(id) && !candidates.some((c) => c.id === id),
  );
  if (expUserIds.length && candidates.length < AI_SEARCH_POOL) {
    let expQ = supabase
      .from("profiles")
      .select(CAND_SELECT)
      .in("id", expUserIds.slice(0, AI_SEARCH_POOL - candidates.length));
    if (verifiedOnly) expQ = expQ.eq("verified_student", true);
    const { data: expProfiles } = await expQ.returns<Candidate[]>();
    for (const p of expProfiles ?? []) {
      if (!blocked.has(p.id)) candidates.push(p);
    }
  }

  // Thin pool → top up with recent students so the model still has options.
  if (candidates.length < 5) {
    let recentQ = supabase
      .from("profiles")
      .select(CAND_SELECT)
      .neq("id", user.id)
      .order("created_at", { ascending: false })
      .limit(AI_SEARCH_POOL);
    if (verifiedOnly) recentQ = recentQ.eq("verified_student", true);
    const { data: recent } = await recentQ.returns<Candidate[]>();
    const seen = new Set(candidates.map((c) => c.id));
    for (const r of recent ?? []) {
      if (candidates.length >= AI_SEARCH_POOL) break;
      if (!blocked.has(r.id) && !seen.has(r.id)) candidates.push(r);
    }
  }

  if (candidates.length === 0) return { empty: true };

  // AI off → return the prefilter pool as-is, no quota consumed.
  if (!aiEnabled()) return { results: candidates.slice(0, 8).map(toResult) };

  const { data: allowed } = opts.skipQuota
    ? { data: true }
    : await supabase.rpc("use_ai_quota", { p_kind: "people_search" });
  // Free user out of their 5/day → upsell; Pro cap is 150/day.
  if (!allowed) return pro ? { results: candidates.slice(0, 8).map(toResult) } : { overCap: true };

  const { data: candExp } = await supabase
    .from("experiences")
    .select("user_id, kind, org, role, term")
    .in("user_id", candidates.map((c) => c.id))
    .order("created_at", { ascending: false })
    .returns<ExpRow[]>();
  const expByUser = new Map<string, ExpRow[]>();
  for (const e of candExp ?? []) {
    const arr = expByUser.get(e.user_id) ?? [];
    if (arr.length < 3) arr.push(e);
    expByUser.set(e.user_id, arr);
  }

  const { data: candEdu } = await supabase
    .from("education")
    .select("user_id, school, field, degree, end_date, is_current")
    .in("user_id", candidates.map((c) => c.id))
    .returns<EduRow[]>();
  const eduRowsByUser = new Map<string, EduRow[]>();
  for (const e of candEdu ?? []) {
    const arr = eduRowsByUser.get(e.user_id) ?? [];
    arr.push(e);
    eduRowsByUser.set(e.user_id, arr);
  }
  const eduByUser = new Map<string, EduInfo>();
  for (const [userId, rows] of eduRowsByUser) {
    const picked =
      rows.find((r) => r.is_current === true) ??
      rows.reduce((latest, r) => ((r.end_date ?? "") > (latest.end_date ?? "") ? r : latest));
    eduByUser.set(userId, {
      end_date: picked.end_date,
      field: picked.field,
      degree: picked.degree,
      school: picked.school,
    });
  }

  const list = candidates
    .map((c) => compactCandidate(c, expByUser.get(c.id) ?? [], eduByUser.get(c.id)))
    .join("\n");
  const raw = await generateText(
    PEOPLE_SEARCH_SYSTEM,
    `Looking for: ${untrusted(safe)}\n\nCandidates:\n${list}`,
    { model: modelForTier(pro), maxTokens: 500, temperature: 0.2 },
  );

  const ranked = parseRanked(raw, candidates);
  // Parse failed / model returned nothing usable → still show the prefilter pool.
  return { results: ranked.length ? ranked : candidates.slice(0, 8).map(toResult) };
}
