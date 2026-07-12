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

// Shared generate+cache path for connection one-liners (on-demand match + weekly
// digest). `supabase` may be a session client or the admin cron client; both
// write the same cache row shape. Returns null when the model call fails.
export async function generateConnectionLine(
  supabase: SupabaseClient,
  viewerId: string,
  candidate: { id: string; name: string },
  sharedFacts: string,
  model: string | undefined,
): Promise<string | null> {
  const text = await generateText(
    CONNECTION_SYSTEM,
    `Person: ${untrusted(candidate.name)}. Shared facts: ${untrusted(sharedFacts)}.`,
    { model, temperature: 0.4 },
  );
  if (text) {
    await supabase.from("ai_connection_prompts").insert({
      viewer_id: viewerId,
      candidate_id: candidate.id,
      prompt: text,
    });
  }
  return text;
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

  const template = (): string | null => {
    if (school && major) return `Also studies ${major} at ${school}.`;
    if (major) return `Also studies ${major}.`;
    if (school) return `Also at ${school}.`;
    if (year) return `Also a ${year}.`;
    return null;
  };

  const hasSharedFact = !!(school || major || year);

  if (aiEnabled() && hasSharedFact) {
    const { data: withinCap } = await supabase.rpc("use_ai_quota", { p_kind: "connection_prompt" });
    if (withinCap) {
      const facts = [
        school && `same school: ${school}`,
        major && `same major: ${major}`,
        year && `same year: ${year}`,
      ]
        .filter(Boolean)
        .join("; ");
      const text = await generateConnectionLine(
        supabase,
        viewerId,
        candidate,
        facts,
        modelForTier(viewerIsPro),
      );
      if (text) return text;
    }
  }

  return template();
}
