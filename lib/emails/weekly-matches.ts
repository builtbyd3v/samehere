// Weekly "3 people to meet" digest — free basic (3, no AI) + Pro enhanced (5,
// each with an AI "why you match" line). Sent from
// app/api/cron/weekly-matches/route.ts. Table layout + inline CSS because
// email clients strip <style> blocks; colors match DESIGN.md's cream/charcoal
// light theme, same palette as lib/emails/welcome.ts.
const CREAM = "#f7f4ed";
const CANVAS = "#ffffff";
const INK = "#1c1c1c";
const INK_MUTED = "#5c5a54";
const BORDER = "#eceae4";

export type MatchCard = {
  username: string;
  name: string;
  avatarUrl: string | null;
  school: string | null;
  // AI "why you match" line — Pro recipients only, null when the pair had no
  // shared fact, the AI call was skipped/failed, or the run's AI budget was spent.
  reason: string | null;
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function cardHtml(c: MatchCard): string {
  const name = escapeHtml(c.name);
  const initial = escapeHtml(c.name.charAt(0).toUpperCase() || "?");
  const avatar = c.avatarUrl
    ? `<img src="${escapeHtml(c.avatarUrl)}" width="44" height="44" alt="" style="display:block;width:44px;height:44px;border-radius:9999px;object-fit:cover;border:1px solid ${BORDER};" />`
    : `<div style="width:44px;height:44px;border-radius:9999px;background:${CREAM};border:1px solid ${BORDER};color:${INK_MUTED};font-size:16px;font-weight:600;text-align:center;line-height:44px;">${initial}</div>`;

  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border:1px solid ${BORDER};border-radius:12px;">
          <tr>
            <td style="padding:14px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="44" style="vertical-align:top;">${avatar}</td>
                  <td style="padding-left:12px;vertical-align:top;">
                    <p style="margin:0;font-size:15px;font-weight:600;color:${INK};">${name}</p>
                    ${c.school ? `<p style="margin:2px 0 0;font-size:13px;color:${INK_MUTED};">${escapeHtml(c.school)}</p>` : ""}
                    ${c.reason ? `<p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:${INK_MUTED};">${escapeHtml(c.reason)}</p>` : ""}
                  </td>
                  <td style="vertical-align:top;text-align:right;white-space:nowrap;">
                    <a href="https://samehere.dev/profile/${escapeHtml(c.username)}" style="display:inline-block;background:${INK};color:${CANVAS};font-size:13px;font-weight:600;text-decoration:none;padding:8px 14px;border-radius:8px;">View profile</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`;
}

export function weeklyMatchesEmail({
  cards,
  isPro,
  unsubUrl,
}: {
  cards: MatchCard[];
  isPro: boolean;
  unsubUrl: string;
}): { subject: string; text: string; html: string } {
  const subject = isPro
    ? `${cards.length} students to meet this week`
    : `${cards.length} student${cards.length === 1 ? "" : "s"} to meet this week`;

  const text = [
    isPro ? "Students to meet this week:" : "3 students to meet this week:",
    "",
    ...cards.map((c) => {
      const lines = [`${c.name} (@${c.username})${c.school ? ` — ${c.school}` : ""}`];
      if (c.reason) lines.push(c.reason);
      lines.push(`https://samehere.dev/profile/${c.username}`);
      return lines.join("\n");
    }),
    "",
    `too many emails? turn this off: ${unsubUrl}`,
  ].join("\n\n");

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
            <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;letter-spacing:-0.02em;color:${INK};">
              ${cards.length} students to meet this week
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px;">
            ${cards.map(cardHtml).join("")}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 28px;border-top:1px solid ${BORDER};">
            <p style="margin:0;font-size:13px;line-height:1.6;color:${INK_MUTED};">
              <a href="${escapeHtml(unsubUrl)}" style="color:${INK_MUTED};text-decoration:underline;">too many emails? turn this off</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();

  return { subject, text, html };
}
