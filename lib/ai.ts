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
// (see modelForTier); `opts.maxTokens` caps output length; `opts.temperature`
// is omitted when unset so the provider default still applies.
export async function generateText(
  system: string,
  prompt: string,
  opts?: { model?: string; maxTokens?: number; temperature?: number },
): Promise<string | null> {
  const useModel = opts?.model ?? model;
  if (!client || !useModel) return null;

  const baseTokens = opts?.maxTokens ?? 80;

  const call = (withTemp: boolean, maxTokens: number) =>
    client!.chat.completions.create({
      model: useModel,
      max_completion_tokens: maxTokens,
      ...(withTemp && opts?.temperature !== undefined ? { temperature: opts.temperature } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });

  // Reasoning models (claude-sonnet-5 via OpenAI compat) burn the whole
  // max_completion_tokens budget on hidden reasoning and return EMPTY content
  // with finish_reason=length. Detect that and retry once with 4x headroom
  // (floor 2000) so every caller's small budget keeps working on both tiers.
  const extract = (res: Awaited<ReturnType<typeof call>>) => {
    const choice = res.choices[0];
    const text = choice?.message?.content?.trim() || null;
    return { text, truncatedEmpty: !text && choice?.finish_reason === "length" };
  };

  const run = async (withTemp: boolean): Promise<string | null> => {
    const first = extract(await call(withTemp, baseTokens));
    if (!first.truncatedEmpty) return first.text;
    return extract(await call(withTemp, Math.max(baseTokens * 4, 2000))).text;
  };

  try {
    return await run(true);
  } catch {
    if (opts?.temperature === undefined) return null;
    // ponytail: retry-once-without-temperature on any error — some models (claude-sonnet-5 via OpenAI compat) 400 on the param; no per-model capability table.
    try {
      return await run(false);
    } catch {
      return null;
    }
  }
}
