import OpenAI from "openai";

// Single server-side client. Provider swaps purely by env (OPENAI_BASE_URL /
// OPENAI_MODEL) — no abstraction layer.
// ponytail: baseURL swap covers model flexibility; no provider abstraction.
const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL;
const model = process.env.OPENAI_MODEL;
const client = apiKey ? new OpenAI({ apiKey, baseURL }) : null;

export function aiEnabled(): boolean {
  return !!client && !!model;
}

// Result of an on-demand nudge action. `overCap` means a free user hit their
// daily quota — the UI shows an upsell at that point. Every other case (success,
// AI off, or a failed call) collapses to `text` so the surface degrades quietly.
export type AiResult = { text: string } | { overCap: true };

// The model to use for a given tier. Pro gets OPENAI_MODEL_PRO; free (and Pro
// when the Pro model is unset) gets OPENAI_MODEL. Returns undefined only when
// neither is configured — generateText then no-ops like any unconfigured call.
export function modelForTier(isPro: boolean): string | undefined {
  return isPro ? process.env.OPENAI_MODEL_PRO ?? process.env.OPENAI_MODEL : process.env.OPENAI_MODEL;
}

// Generated text, or null if AI is unconfigured OR the call fails — every caller
// MUST have a non-AI fallback. Output is untrusted: callers render it as plain
// text, never dangerouslySetInnerHTML. `opts.model` overrides the default model
// (see modelForTier); `opts.maxTokens` caps output length.
export async function generateText(
  system: string,
  prompt: string,
  opts?: { model?: string; maxTokens?: number },
): Promise<string | null> {
  const useModel = opts?.model ?? model;
  if (!client || !useModel) return null;
  try {
    const res = await client.chat.completions.create({
      model: useModel,
      max_completion_tokens: opts?.maxTokens ?? 80,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });
    return res.choices[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}
