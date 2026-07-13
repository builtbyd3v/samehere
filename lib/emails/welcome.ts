// Branded welcome email — sent once, fire-and-forget, from app/auth/confirm/route.ts
// on a fresh signup confirmation. Chrome (canvas, card, two-tone wordmark,
// button, footer) comes from lib/emails/layout.ts.
import { INK, INK_MUTED, emailShell, button, footerRow } from "./layout";

export function welcomeEmail(): { subject: string; text: string; html: string } {
  const subject = "welcome to samehere";

  const text =
    "hey, you're in. samehere is small right now, on purpose: every person here was invited. " +
    "three things worth doing first: finish your profile, post something real, and join a club at https://samehere.dev/community.\n\nDev";

  const html = emailShell(`
        <tr>
          <td style="padding:8px 32px 0;">
            <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;letter-spacing:-0.02em;color:${INK};">
              hey, you're in.
            </h1>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${INK_MUTED};">
              samehere is small right now, on purpose: every person here was invited.
              three things worth doing first:
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="padding:4px 0;font-size:15px;line-height:1.6;color:${INK};">1. Finish your profile</td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:15px;line-height:1.6;color:${INK};">2. Post something real</td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:15px;line-height:1.6;color:${INK};">3. Join a club</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding-bottom:10px;">
                  ${button("https://samehere.dev/onboarding", "Finish your profile")}
                </td>
              </tr>
              <tr>
                <td style="text-align:center;font-size:13px;">
                  <a href="https://samehere.dev/feed" style="color:${INK_MUTED};text-decoration:underline;margin-right:16px;">Explore the feed</a>
                  <a href="https://samehere.dev/community" style="color:${INK_MUTED};text-decoration:underline;">Join a club</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${footerRow(`<p style="margin:0;font-size:13px;line-height:1.6;color:${INK_MUTED};">Dev</p>`)}`);

  return { subject, text, html };
}
