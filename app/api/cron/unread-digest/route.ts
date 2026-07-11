import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { makeUnsubToken } from "@/lib/email-unsub";

// ponytail: hard ceiling on one cron run + sequential-batch throttle. Not a
// real queue/backoff — fine at current scale, revisit only if volume grows.
const MAX_RECIPIENTS = 200;
const BATCH_SIZE = 5;

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Sanctioned admin-client read (Plan 013 / SESSION DECISION #2): this route
  // has no user session (it's invoked by Vercel Cron), and the underlying RPC
  // iterates every user's unread counts, which no single session could read
  // under RLS. EXECUTE on the RPC is revoked from anon/authenticated — only
  // this admin-client call can invoke it.
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("list_unread_digest_recipients");
  if (error) {
    return NextResponse.json({ error: "Could not load recipients" }, { status: 500 });
  }

  const recipients = data ?? [];
  const batch = recipients.slice(0, MAX_RECIPIENTS);
  if (recipients.length > MAX_RECIPIENTS) {
    console.error(
      `unread-digest: capped run at ${MAX_RECIPIENTS} recipients, skipped ${recipients.length - MAX_RECIPIENTS}`
    );
  }

  let sent = 0;
  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const slice = batch.slice(i, i + BATCH_SIZE);
    await Promise.all(
      slice.map(async (r) => {
        const lines: string[] = [];
        if (r.dm_unread > 0) lines.push(`${r.dm_unread} new message${r.dm_unread === 1 ? "" : "s"}`);
        if (r.notif_unread > 0) lines.push(`${r.notif_unread} notification${r.notif_unread === 1 ? "" : "s"}`);
        const total = r.dm_unread + r.notif_unread;
        const token = makeUnsubToken(r.user_id);
        const text = [
          ...lines,
          "",
          "https://samehere.dev/feed",
          "",
          `too many emails? turn this off: https://samehere.dev/api/email/unsubscribe?u=${token}`,
        ].join("\n");

        try {
          await sendEmail({
            to: r.email,
            from: "noreply@samehere.dev",
            subject: `you have ${total} unread on samehere`,
            text,
          });
          sent += 1;
        } catch {
          // one recipient's failure must not block the rest of the run
        }
      })
    );
  }

  return NextResponse.json({ sent, total: recipients.length });
}
