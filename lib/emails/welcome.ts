// Branded welcome email — sent once, fire-and-forget, from app/auth/confirm/route.ts
// on a fresh signup confirmation. Table layout + inline CSS because email
// clients strip <style> blocks. Colors match DESIGN.md's cream/charcoal light
// theme (email has no dark-mode toggle to key off, so it just ships light).
const CREAM = "#f7f4ed";
const CANVAS = "#ffffff";
const INK = "#1c1c1c";
const INK_MUTED = "#5c5a54";
const BORDER = "#eceae4";

export function welcomeEmail(): { subject: string; text: string; html: string } {
  const subject = "welcome to samehere";

  const text =
    "hey — you're in. samehere is small right now, on purpose: every person here was invited. " +
    "three things worth doing first: finish your profile, post something real, and join a club at https://samehere.dev/community. — Dev";

  const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:${CANVAS};border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:32px 32px 8px;">
            <p style="margin:0;font-size:15px;font-weight:600;letter-spacing:-0.01em;color:${INK};">samehere</p>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 0;">
            <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;letter-spacing:-0.02em;color:${INK};">
              hey — you're in.
            </h1>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${INK_MUTED};">
              samehere is small right now, on purpose: every person here was invited.
              three things worth doing first —
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
                  <a href="https://samehere.dev/onboarding" style="display:block;text-align:center;background:${INK};color:${CANVAS};font-size:14px;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:8px;">
                    Finish your profile
                  </a>
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
        <tr>
          <td style="padding:16px 32px 28px;border-top:1px solid ${BORDER};">
            <p style="margin:0;font-size:13px;line-height:1.6;color:${INK_MUTED};">— Dev</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();

  return { subject, text, html };
}
