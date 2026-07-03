import type { SupabaseClient } from "@supabase/supabase-js";
import { aiEnabled, generateText } from "@/lib/ai";
import type { MatchSignal } from "@/lib/match";

function norm(s: string | null): string {
  return s?.trim().toLowerCase() ?? "";
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
  candidate: { id: string; name: string } & MatchSignal
): Promise<string | null> {
  const { data: cached } = await supabase
    .from("ai_connection_prompts")
    .select("prompt")
    .eq("viewer_id", viewerId)
    .eq("candidate_id", candidate.id)
    .maybeSingle();
  if (cached) return cached.prompt;

  const school = norm(viewer.school) && norm(viewer.school) === norm(candidate.school) ? candidate.school : null;
  const major = norm(viewer.major) && norm(viewer.major) === norm(candidate.major) ? candidate.major : null;
  const year = norm(viewer.year) && norm(viewer.year) === norm(candidate.year) ? candidate.year : null;
  const viewerSkills = new Set((viewer.skills ?? []).map(norm).filter(Boolean));
  const sharedSkills = (candidate.skills ?? []).filter((s) => viewerSkills.has(norm(s)));

  const template = (): string | null => {
    if (school && major) return `Also studies ${major} at ${school}.`;
    if (major) return `Also studies ${major}.`;
    if (school) return `Also at ${school}.`;
    if (sharedSkills.length > 0) return `Shares your interest in ${sharedSkills[0]}.`;
    if (year) return `Also a ${year}.`;
    return null;
  };

  const hasSharedFact = !!(school || major || year || sharedSkills.length > 0);

  if (aiEnabled() && hasSharedFact) {
    const { data: withinCap } = await supabase.rpc("use_ai_quota", { p_kind: "connection_prompt", p_cap: 3 });
    if (withinCap) {
      const facts = [
        school && `same school: ${school}`,
        major && `same major: ${major}`,
        year && `same year: ${year}`,
        sharedSkills.length > 0 && `shared skills: ${sharedSkills.join(", ")}`,
      ]
        .filter(Boolean)
        .join("; ");
      const text = await generateText(
        "Write one sentence, at most 20 words, telling the reader why they should follow the given person. Be specific, no flattery, no greeting. Base it ONLY on the shared facts provided.",
        `Person: ${candidate.name}. Shared facts: ${facts}.`
      );
      if (text) {
        await supabase.from("ai_connection_prompts").insert({ viewer_id: viewerId, candidate_id: candidate.id, prompt: text });
        return text;
      }
    }
  }

  return template();
}
