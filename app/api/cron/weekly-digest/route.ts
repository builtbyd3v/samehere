import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { parseDigestContent, weeklyDigestEmail } from "@/lib/emails/weekly-digest";
import { makeUnsubToken } from "@/lib/email-unsub";
import { SITE_URL } from "@/lib/site";

// Worst case: 40 sequential batches of concurrent sendEmail calls, ~1s each, about 40s plus margin.
export const maxDuration = 60;

// ponytail: hard ceiling on one cron run + sequential-batch throttle. Not a
// real queue/backoff, fine at current scale, revisit only if volume grows.
const MAX_RECIPIENTS = 200;
const BATCH_SIZE = 5;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Dark by default: sends only with the flag AND an email key, and never on ?dry=1.
  const live =
    new URL(request.url).searchParams.get("dry") !== "1" &&
    process.env.WEEKLY_DIGEST_ENABLED === "1" &&
    Boolean(process.env.RESEND_API_KEY);

  const startedAt = Date.now();

  // Sanctioned admin-client read (see lib/supabase/admin.ts): no user session
  // exists (Vercel Cron caller), and the RPC reads every opted-in user's digest,
  // which no single session could read under RLS. EXECUTE is revoked from
  // anon/authenticated, so only this admin-client call can invoke it.
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("list_weekly_digest");
  if (error) {
    console.error("weekly-digest: RPC failed", error);
    return NextResponse.json({ error: "Could not load recipients" }, { status: 500 });
  }

  const recipients = data ?? [];
  const batch = recipients.slice(0, MAX_RECIPIENTS);
  if (recipients.length > MAX_RECIPIENTS) {
    console.error(
      `weekly-digest: capped run at ${MAX_RECIPIENTS} recipients, skipped ${recipients.length - MAX_RECIPIENTS}`
    );
  }

  if (!live) {
    // Counts only: no tokens, no sends, and no emails or user ids in the response.
    let wouldSend = 0;
    for (const r of batch) {
      if (weeklyDigestEmail(parseDigestContent(r), `${SITE_URL}/api/email/unsubscribe?u=dry-run`)) wouldSend += 1;
    }
    return NextResponse.json({ dry: true, wouldSend, empty: batch.length - wouldSend, total: recipients.length });
  }

  let sent = 0;
  let empty = 0;
  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const slice = batch.slice(i, i + BATCH_SIZE);
    await Promise.all(
      slice.map(async (r) => {
        const token = makeUnsubToken(r.user_id);
        const unsubUrl = `${SITE_URL}/api/email/unsubscribe?u=${token}`;
        const email = weeklyDigestEmail(parseDigestContent(r), unsubUrl);
        if (!email) {
          empty += 1;
          return;
        }

        try {
          await sendEmail({
            to: r.email,
            from: "noreply@samehere.dev",
            subject: email.subject,
            text: email.text,
            html: email.html,
            headers: {
              "List-Unsubscribe": `<${unsubUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          });
          sent += 1;
        } catch {
          // one recipient's failure must not block the rest of the run. Do not
          // log the caught error: sendEmail's failure message can echo back
          // the recipient's email address from Resend's response body.
          console.error("weekly-digest: send failed for recipient", r.user_id);
        }
      })
    );
  }

  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs > maxDuration * 1000 * 0.8) {
    console.error(`weekly-digest: elapsed ${elapsedMs}ms crossed 80% of maxDuration (${maxDuration}s)`);
  }

  return NextResponse.json({ sent, empty, total: recipients.length });
}
