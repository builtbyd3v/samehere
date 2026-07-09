import type { SupabaseClient } from "@supabase/supabase-js";
import { aiEnabled, generateText, modelForTier } from "@/lib/ai";
import { CONNECTION_SYSTEM, untrusted } from "@/lib/ai-prompts";
import type { MatchSignal } from "@/lib/match";

function norm(s: string | null): string {
  return s?.trim().toLowerCase() ?? "";
}

// Batched cache read for a viewer's candidates — one query instead of one per
// candidate. Callers should use this first and only fall through to
// connectionPrompt() (which generates + caches via AI) for cache misses.
export async function cachedConnectionPrompts(
  supabase: SupabaseClient,
  viewerId: string,
  candidateIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (candidateIds.length === 0) return map;
  const { data } = await supabase
    .from("ai_connection_prompts")
    .select("candidate_id, prompt")
    .eq("viewer_id", viewerId)
    .in("candidate_id", candidateIds);
  for (const row of data ?? []) map.set(row.candidate_id, row.prompt);
  return map;
}

// One sentence on why the viewer should follow candidate, grounded in shared
// public profile facts only (never bio/goals text or post content). Cached
// per (viewer, candidate); falls back to a deterministic template when AI is
// off, over quota, has no shared facts to work with, or the call fails.
// ponytail: cache by pair, no invalidation; template fallback carries it when AI is off/over-quota.
export async function connectionPrompt(
  supabase: SupabaseClient,
  viewerId: string,
  viewer: MatchSignal,
  candidate: { id: string; name: string } & MatchSignal,
  viewerIsPro: boolean,
  // Callers that already ran cachedConnectionPrompts() and got a miss for this
  // candidate pass true, so we don't re-query a row we know isn't there.
  knownCacheMiss = false
): Promise<string | null> {
  if (!knownCacheMiss) {
    const { data: cached } = await supabase
      .from("ai_connection_prompts")
      .select("prompt")
      .eq("viewer_id", viewerId)
      .eq("candidate_id", candidate.id)
      .maybeSingle();
    if (cached) return cached.prompt;
  }

  const school = norm(viewer.school) && norm(viewer.school) === norm(candidate.school) ? candidate.school : null;
  const major = norm(viewer.major) && norm(viewer.major) === norm(candidate.major) ? candidate.major : null;
  const year = norm(viewer.year) && norm(viewer.year) === norm(candidate.year) ? candidate.year : null;
  const viewerSkills = new Set((viewer.skills ?? []).map(norm).filter(Boolean));
  const sharedSkills = (candidate.skills ?? []).filter((s) => viewerSkills.has(norm(s)));
  const viewerCourses = new Set((viewer.courses ?? []).map(norm).filter(Boolean));
  const sharedCourses = (candidate.courses ?? []).filter((c) => viewerCourses.has(norm(c)));

  const template = (): string | null => {
    if (sharedCourses.length > 0) return `Also taking ${sharedCourses[0]}.`;
    if (school && major) return `Also studies ${major} at ${school}.`;
    if (major) return `Also studies ${major}.`;
    if (school) return `Also at ${school}.`;
    if (sharedSkills.length > 0) return `Shares your interest in ${sharedSkills[0]}.`;
    if (year) return `Also a ${year}.`;
    return null;
  };

  const hasSharedFact = !!(school || major || year || sharedSkills.length > 0 || sharedCourses.length > 0);

  if (aiEnabled() && hasSharedFact) {
    const { data: withinCap } = await supabase.rpc("use_ai_quota", { p_kind: "connection_prompt" });
    if (withinCap) {
      const facts = [
        sharedCourses.length > 0 && `same courses: ${sharedCourses.join(", ")}`,
        school && `same school: ${school}`,
        major && `same major: ${major}`,
        year && `same year: ${year}`,
        sharedSkills.length > 0 && `shared skills: ${sharedSkills.join(", ")}`,
      ]
        .filter(Boolean)
        .join("; ");
      const text = await generateText(
        CONNECTION_SYSTEM,
        `Person: ${untrusted(candidate.name)}. Shared facts: ${untrusted(facts)}.`,
        { model: modelForTier(viewerIsPro) }
      );
      if (text) {
        await supabase.from("ai_connection_prompts").insert({ viewer_id: viewerId, candidate_id: candidate.id, prompt: text });
        return text;
      }
    }
  }

  return template();
}
