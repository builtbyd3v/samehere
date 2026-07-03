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

// Generated text, or null if AI is unconfigured OR the call fails — every caller
// MUST have a non-AI fallback. Output is untrusted: callers render it as plain
// text, never dangerouslySetInnerHTML.
export async function generateText(system: string, prompt: string, maxTokens = 80): Promise<string | null> {
  if (!client || !model) return null;
  try {
    const res = await client.chat.completions.create({
      model,
      max_completion_tokens: maxTokens,
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
