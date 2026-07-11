import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { makeUnsubToken } from "@/lib/email-unsub";
import { scoreOverlap, type MatchSignal } from "@/lib/match";
import { isPro } from "@/lib/pro";
import { aiEnabled, generateText, modelForTier } from "@/lib/ai";
import { CONNECTION_SYSTEM, untrusted } from "@/lib/ai-prompts";
import { weeklyMatchesEmail, type MatchCard } from "@/lib/emails/weekly-matches";

// ponytail: same ceilings as unread-digest — hard cap + sequential-batch
// throttle, not a real queue/backoff. Fine at current scale.
const MAX_RECIPIENTS = 200;
const BATCH_SIZE = 5;
// Separate, smaller ceiling on Pro "why you match" AI lines. The cron has no
// user session, so it can't route through use_ai_quota (that RPC keys off
// auth.uid(), which is null here, and it's meant for interactive per-user
// caps anyway) — bound total spend with a flat per-run counter instead.
// // ponytail: cost ceiling, not exact — batches run concurrently so the
// counter can overshoot by up to BATCH_SIZE; good enough for a cap.
const MAX_AI_RECIPIENTS = 50;

const FREE_TAKE = 3;
const PRO_TAKE = 5;

function norm(s: string | null): string {
  return s?.trim().toLowerCase() ?? "";
}

// Same grounded-fact template as lib/connection-prompt.ts's fallback, kept
// local: the cron can't reuse that module's connectionPrompt() directly
// because it gates on use_ai_quota internally (see cap note above).
function sharedFactLine(viewer: MatchSignal, candidate: MatchSignal): string | null {
  const school = norm(viewer.school) && norm(viewer.school) === norm(candidate.school) ? candidate.school : null;
  const major = norm(viewer.major) && norm(viewer.major) === norm(candidate.major) ? candidate.major : null;
  const year = norm(viewer.year) && norm(viewer.year) === norm(candidate.year) ? candidate.year : null;
  if (school && major) return `Also studies ${major} at ${school}.`;
  if (major) return `Also studies ${major}.`;
  if (school) return `Also at ${school}.`;
  if (year) return `Also a ${year}.`;
  return null;
}

type Recipient = {
  user_id: string;
  email: string;
  is_pro: boolean;
  pro_until: string | null;
  year: string | null;
  major: string | null;
  goals: string | null;
  bio: string | null;
  school: string | null;
};

type Candidate = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  school: string | null;
  year: string | null;
  major: string | null;
  goals: string | null;
  bio: string | null;
};

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Sanctioned admin-client read (mirrors unread-digest): no user session
  // (Vercel Cron caller), and the RPCs iterate every user / a cross-user
  // candidate pool that no single session could read under RLS.
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("list_weekly_match_recipients");
  if (error) {
    return NextResponse.json({ error: "Could not load recipients" }, { status: 500 });
  }

  const recipients = (data ?? []) as Recipient[];
  // Pro first so batch sequencing gives them a small head start ("sent
  // earlier" from the plan) without a second cron trigger.
  const sorted = [...recipients].sort((x, y) => Number(y.is_pro) - Number(x.is_pro));
  const batch = sorted.slice(0, MAX_RECIPIENTS);
  if (sorted.length > MAX_RECIPIENTS) {
    console.error(`weekly-matches: capped run at ${MAX_RECIPIENTS} recipients, skipped ${sorted.length - MAX_RECIPIENTS}`);
  }

  let sent = 0;
  let aiUsed = 0;
  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const slice = batch.slice(i, i + BATCH_SIZE);
    await Promise.all(
      slice.map(async (r) => {
        const recipientPro = isPro({ is_pro: r.is_pro, pro_until: r.pro_until });
        const viewerSignal: MatchSignal = { year: r.year, major: r.major, goals: r.goals, bio: r.bio, school: r.school };

        const { data: candidateData } = await admin.rpc("get_match_candidates", { p_user: r.user_id });
        const candidates = (candidateData ?? []) as Candidate[];
        if (candidates.length === 0) return;

        const ranked = candidates
          .map((c) => ({
            c,
            score: scoreOverlap(viewerSignal, { year: c.year, major: c.major, goals: c.goals, bio: c.bio, school: c.school }),
          }))
          .sort((x, y) => y.score - x.score)
          .map((x) => x.c);

        const top = ranked.slice(0, recipientPro ? PRO_TAKE : FREE_TAKE);
        if (top.length === 0) return;

        const cards: MatchCard[] = [];
        for (const cand of top) {
          let reason: string | null = null;

          if (recipientPro) {
            const { data: cached } = await admin
              .from("ai_connection_prompts")
              .select("prompt")
              .eq("viewer_id", r.user_id)
              .eq("candidate_id", cand.id)
              .maybeSingle();

            if (cached) {
              reason = cached.prompt;
            } else if (aiEnabled() && aiUsed < MAX_AI_RECIPIENTS) {
              const candidateSignal: MatchSignal = { year: cand.year, major: cand.major, goals: cand.goals, bio: cand.bio, school: cand.school };
              const fact = sharedFactLine(viewerSignal, candidateSignal);
              if (fact) {
                aiUsed += 1;
                const facts = [
                  norm(viewerSignal.school) && norm(viewerSignal.school) === norm(candidateSignal.school) && `same school: ${cand.school}`,
                  norm(viewerSignal.major) && norm(viewerSignal.major) === norm(candidateSignal.major) && `same major: ${cand.major}`,
                  norm(viewerSignal.year) && norm(viewerSignal.year) === norm(candidateSignal.year) && `same year: ${cand.year}`,
                ]
                  .filter(Boolean)
                  .join("; ");
                const name = cand.display_name ?? cand.username;
                const text = await generateText(
                  CONNECTION_SYSTEM,
                  `Person: ${untrusted(name)}. Shared facts: ${untrusted(facts)}.`,
                  { model: modelForTier(true) }
                );
                if (text) {
                  reason = text;
                  await admin.from("ai_connection_prompts").insert({ viewer_id: r.user_id, candidate_id: cand.id, prompt: text });
                } else {
                  reason = fact;
                }
              }
            }
          }

          cards.push({
            username: cand.username,
            name: cand.display_name ?? cand.username,
            avatarUrl: cand.avatar_url,
            school: cand.school,
            reason,
          });
        }

        const token = makeUnsubToken(r.user_id);
        const unsubUrl = `https://samehere.dev/api/email/unsubscribe?u=${token}`;
        const { subject, text, html } = weeklyMatchesEmail({ cards, isPro: recipientPro, unsubUrl });

        try {
          await sendEmail({ to: r.email, from: "noreply@samehere.dev", subject, text, html });
          sent += 1;
        } catch {
          // one recipient's failure must not block the rest of the run
        }
      })
    );
  }

  return NextResponse.json({ sent, total: sorted.length });
}
