// Unread-activity digest — "you have N unread on samehere". Sent per recipient
// from app/api/cron/unread-digest/route.ts. Chrome from lib/emails/layout.ts.
import { INK, INK_MUTED, emailShell, button, footerRow } from "./layout";

export function unreadDigestEmail({
  dmUnread,
  notifUnread,
  unsubUrl,
}: {
  dmUnread: number;
  notifUnread: number;
  unsubUrl: string;
}): { subject: string; text: string; html: string } {
  const lines: string[] = [];
  if (dmUnread > 0) lines.push(`${dmUnread} new message${dmUnread === 1 ? "" : "s"}`);
  if (notifUnread > 0) lines.push(`${notifUnread} notification${notifUnread === 1 ? "" : "s"}`);
  const total = dmUnread + notifUnread;

  const subject = `you have ${total} unread on samehere`;

  const text = [
    ...lines,
    "",
    "https://samehere.dev/feed",
    "",
    `too many emails? turn this off: ${unsubUrl}`,
  ].join("\n");

  const html = emailShell(`
        <tr>
          <td style="padding:8px 32px 0;">
            <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;letter-spacing:-0.02em;color:${INK};">
              you have ${total} unread
            </h1>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              ${lines
                .map(
                  (l) =>
                    `<tr><td style="padding:4px 0;font-size:15px;line-height:1.6;color:${INK};">${l}</td></tr>`
                )
                .join("")}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px;">
            ${button("https://samehere.dev/feed", "Open samehere")}
          </td>
        </tr>
        ${footerRow(
          `<p style="margin:0;font-size:13px;line-height:1.6;color:${INK_MUTED};"><a href="${unsubUrl}" style="color:${INK_MUTED};text-decoration:underline;">too many emails? turn this off</a></p>`
        )}`);

  return { subject, text, html };
}
