import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchSignal } from "@/lib/match";

function norm(s: string | null): string {
  return s?.trim().toLowerCase() ?? "";
}

export async function cachedConnectionPrompts(
  _supabase: SupabaseClient,
  _viewerId: string,
  _candidateIds: string[],
): Promise<Map<string, string>> {
  return new Map();
}

export async function generateConnectionLine(
  _supabase: SupabaseClient,
  _viewerId: string,
  _candidate: { id: string; name: string },
  _sharedFacts: string,
  _model: string | undefined,
): Promise<string | null> {
  return null;
}

export async function connectionPrompt(
  _supabase: SupabaseClient,
  _viewerId: string,
  viewer: MatchSignal,
  candidate: { id: string; name: string } & MatchSignal,
  _viewerIsPro: boolean,
  _knownCacheMiss = false,
): Promise<string | null> {
  const school = norm(viewer.school) && norm(viewer.school) === norm(candidate.school) ? candidate.school : null;
  const major = norm(viewer.major) && norm(viewer.major) === norm(candidate.major) ? candidate.major : null;
  if (school && major) return `Also studies ${major} at ${school}.`;
  if (major) return `Also studies ${major}.`;
  if (school) return `Also at ${school}.`;
  return null;
}
