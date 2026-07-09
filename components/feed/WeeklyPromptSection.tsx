import { getWeeklyPrompt } from "@/lib/weekly-prompt";
import WeeklyPromptCard from "@/components/feed/WeeklyPromptCard";

// Own async fetch (cache read, or — on a once-per-ISO-week cache miss — a live
// generateText LLM call). Isolated behind its own Suspense boundary in
// FeedPage so a cold-cache hit never blocks the feed timeline from streaming
// first (same pattern as SuggestedFollows).
export default async function WeeklyPromptSection() {
  const { prompt, weekKey } = await getWeeklyPrompt();
  return <WeeklyPromptCard prompt={prompt} weekKey={weekKey} />;
}
