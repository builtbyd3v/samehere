// Shared shell for all Resend (transactional) emails. Table layout + inline CSS
// because email clients strip <style> blocks. One design source: two-tone
// wordmark (`same` ink, `here` blue) matching app/opengraph-image.tsx, plus the
// cream/charcoal light palette from DESIGN.md. Email has no dark-mode toggle to
// key off, so it ships light only.
// Values mirror the light-theme tokens in app/globals.css :root — emails ship
// light only (no dark-mode toggle to key off). CANVAS is the warm off-white
// card (--surface-card #fcfbf8), NOT pure white; BORDER is the solid equivalent
// of the app's rgba(28,28,28,0.14) hairline over these warm surfaces.
export const CREAM = "#f7f4ed"; // --surface (page)
export const CANVAS = "#fcfbf8"; // --surface-card
export const INK = "#1c1c1c"; // --ink
export const INK_MUTED = "#5f5f5d"; // --ink-muted
export const BORDER = "#dad8d2"; // ≈ rgba(28,28,28,0.14)
export const BLUE = "#0075de"; // --blue

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Wraps caller-supplied <tr> rows in the cream canvas, white card, and two-tone
// wordmark header. Callers own their rows' padding (weekly-matches needs
// edge-to-edge card rows, welcome needs a padded body), so the shell stays a
// thin frame rather than a rigid template.
export function emailShell(rowsHtml: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 16px;font-family:${FONT};">
  <tr>
    <td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:${CANVAS};border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:32px 32px 8px;">
            <p style="margin:0;font-size:15px;font-weight:600;letter-spacing:-0.02em;">
              <span style="color:${INK};">same</span><span style="color:${BLUE};">here</span>
            </p>
          </td>
        </tr>
        ${rowsHtml}
      </table>
    </td>
  </tr>
</table>`.trim();
}

// Primary dark call-to-action button, full width of the content column.
export function button(href: string, label: string): string {
  return `<a href="${href}" style="display:block;text-align:center;background:${INK};color:${CANVAS};font-size:14px;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:8px;">${label}</a>`;
}

// Muted, top-bordered closing row. Pass raw inner HTML (a <p>, links, etc.).
export function footerRow(innerHtml: string): string {
  return `
        <tr>
          <td style="padding:16px 32px 28px;border-top:1px solid ${BORDER};">
            ${innerHtml}
          </td>
        </tr>`;
}
