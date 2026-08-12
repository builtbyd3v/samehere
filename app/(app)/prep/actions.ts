"use server";

import { createClient } from "@/lib/supabase/server";
import { aiEnabled, generateText, modelForTier } from "@/lib/ai";
import { INTERVIEW_FEEDBACK_SYSTEM, untrusted } from "@/lib/ai-prompts";
import { isPro } from "@/lib/pro";
import { getInterviewBank } from "@/lib/path/seeds";
import {
  formatInterviewFeedback,
  parseInterviewFeedbackJson,
} from "@/lib/path/interview-feedback";

export type SubmitInterviewAnswerResult =
  | { feedback: string }
  | { overCap: true }
  | { error: string };

export async function submitInterviewAnswer(input: {
  companySlug: string;
  questionId: string;
  answer: string;
}): Promise<SubmitInterviewAnswerResult> {
  const companySlug = String(input.companySlug ?? "").trim().slice(0, 80);
  const questionId = String(input.questionId ?? "").trim().slice(0, 80);
  const answer = String(input.answer ?? "").trim().slice(0, 8000);
  if (!companySlug || !questionId) return { error: "Missing question." };
  if (!answer) return { error: "Write an answer first." };

  const bank = getInterviewBank(companySlug);
  const question = bank?.questions.find((q) => q.id === questionId);
  if (!bank || !question) return { error: "Unknown question." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro, pro_until")
    .eq("id", user.id)
    .maybeSingle();
  const pro = isPro(profile ?? { is_pro: false, pro_until: null });

  if (!aiEnabled()) return { error: "Feedback is temporarily unavailable." };

  const { data: allowed } = await supabase.rpc("use_ai_quota", {
    p_kind: "interview_feedback",
  });
  if (!allowed) {
    if (!pro) return { overCap: true };
    return { error: "Daily feedback limit reached. Try again tomorrow." };
  }

  const prompt = [
    `Company: ${bank.company_name}`,
    `Question type: ${question.type}`,
    `Difficulty: ${question.difficulty}`,
    `Prompt: ${question.prompt}`,
    `Approach: ${question.approach}`,
    `Evaluating: ${question.evaluating}`,
    "",
    `Student answer: ${untrusted(answer)}`,
  ].join("\n");

  const raw = await generateText(INTERVIEW_FEEDBACK_SYSTEM, prompt, {
    model: modelForTier(pro),
    maxTokens: 500,
    temperature: 0.3,
  });

  const parsed = parseInterviewFeedbackJson(raw);
  if (!parsed) return { error: "Couldn't grade that answer. Try again." };

  const feedback = formatInterviewFeedback(parsed);

  const { error } = await supabase.from("interview_practice").insert({
    user_id: user.id,
    company_slug: bank.company_slug,
    question_id: question.id,
    answer,
    ai_feedback: feedback,
  });
  // ponytail: persist best-effort; still return feedback if insert fails (e.g. bank not seeded)
  if (error) {
    /* ignore — feedback still useful client-side */
  }

  return { feedback };
}
