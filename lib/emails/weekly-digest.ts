// Weekly digest: new people at your stage, open Stuck questions you could
// answer, and (Pro only) portfolio views. Sent per recipient from
// app/api/cron/weekly-digest/route.ts. Chrome from lib/emails/layout.ts.
// Never pads: empty sections are omitted and an empty week returns null.
import { INK, INK_MUTED, emailShell, button, footerRow } from "./layout";
import { STAGE_LABELS, parseStage } from "@/lib/stage";
import { SITE_URL } from "@/lib/site";

export type DigestPerson = { username: string; displayName: string | null; stage: string | null };
export type DigestQuestion = { id: string; excerpt: string; username: string; displayName: string | null };
export type DigestContent = { people: DigestPerson[]; questions: DigestQuestion[]; views: number | null };

export const MAX_PEOPLE = 3;
export const MAX_QUESTIONS = 2;

// The RPC returns at most 141 chars, so a longer raw excerpt was cut upstream.
const EXCERPT_MAX = 140;

/** HTML-escape user-written text (& < > " '). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

/** Narrow one RPC row. Malformed entries are dropped, never guessed. */
export function parseDigestContent(row: { people: unknown; questions: unknown; views_7d: number | null }): DigestContent {
  const people: DigestPerson[] = [];
  for (const e of Array.isArray(row.people) ? row.people : []) {
    if (!isRecord(e) || typeof e.username !== "string") continue;
    people.push({ username: e.username, displayName: str(e.display_name), stage: str(e.stage) });
  }
  const questions: DigestQuestion[] = [];
  for (const e of Array.isArray(row.questions) ? row.questions : []) {
    if (!isRecord(e) || typeof e.username !== "string" || typeof e.id !== "string" || typeof e.excerpt !== "string") continue;
    questions.push({ id: e.id, excerpt: e.excerpt, username: e.username, displayName: str(e.display_name) });
  }
  const v = row.views_7d;
  return {
    people: people.slice(0, MAX_PEOPLE),
    questions: questions.slice(0, MAX_QUESTIONS),
    views: typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null,
  };
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function excerptOf(raw: string): string {
  const flat = raw.replace(/\s+/g, " ").trim();
  return raw.length > EXCERPT_MAX ? `${flat.slice(0, EXCERPT_MAX - 1)}...` : flat;
}

function personLine(p: DigestPerson): string {
  const stage = parseStage(p.stage);
  return [p.displayName ?? p.username, `@${p.username}`, stage ? STAGE_LABELS[stage] : null]
    .filter((s): s is string => s !== null)
    .join(" · ");
}

function section(title: string, itemsHtml: string[]): string {
  return `
            <p style="margin:0 0 4px;font-size:13px;line-height:1.6;color:${INK_MUTED};">${title}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;">
              ${itemsHtml.map((h) => `<tr><td style="padding:4px 0;font-size:15px;line-height:1.6;color:${INK};">${h}</td></tr>`).join("")}
            </table>`;
}

function link(href: string, label: string): string {
  return `<a href="${href}" style="color:${INK};text-decoration:underline;word-break:break-word;">${label}</a>`;
}

/** null means "nothing real to say this week": the caller sends nothing. */
export function weeklyDigestEmail(
  content: DigestContent,
  unsubUrl: string
): { subject: string; text: string; html: string } | null {
  const { people, questions, views } = content;
  const hasViews = views !== null && views > 0;
  if (people.length === 0 && questions.length === 0 && !hasViews) return null;

  const parts: string[] = [];
  if (people.length > 0) parts.push(`${plural(people.length, "new person", "new people")} at your stage`);
  if (questions.length > 0) parts.push(`${plural(questions.length, "open question", "open questions")} you could answer`);
  if (hasViews) parts.push(plural(views, "portfolio view", "portfolio views"));
  const subject = `this week on samehere: ${parts.join(", ")}`;

  const profileUrl = (u: string) => `${SITE_URL}/profile/${encodeURIComponent(u)}`;
  const postUrl = (id: string) => `${SITE_URL}/post/${encodeURIComponent(id)}`;
  const feedUrl = `${SITE_URL}/feed`;
  const viewsLine = hasViews ? `your portfolio got ${plural(views, "view", "views")} in the last 7 days` : null;

  const text = [
    ...(people.length > 0
      ? ["new people at your stage", ...people.map((p) => `${personLine(p)}: ${profileUrl(p.username)}`), ""]
      : []),
    ...(questions.length > 0
      ? [
          "open questions you could answer",
          ...questions.map((q) => `${excerptOf(q.excerpt)} from ${q.displayName ?? q.username}: ${postUrl(q.id)}`),
          "",
        ]
      : []),
    ...(viewsLine ? [viewsLine, ""] : []),
    feedUrl,
    "",
    `not useful? turn off the weekly email: ${unsubUrl}`,
  ].join("\n");

  const html = emailShell(`
        <tr>
          <td style="padding:8px 32px 0;">
            <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;letter-spacing:-0.02em;color:${INK};">
              this week on samehere
            </h1>${
              people.length > 0
                ? section(
                    "new people at your stage",
                    people.map((p) => link(profileUrl(p.username), escapeHtml(personLine(p))))
                  )
                : ""
            }${
              questions.length > 0
                ? section(
                    "open questions you could answer",
                    questions.map(
                      (q) =>
                        `${link(postUrl(q.id), escapeHtml(excerptOf(q.excerpt)))} <span style="color:${INK_MUTED};">from ${escapeHtml(q.displayName ?? q.username)}</span>`
                    )
                  )
                : ""
            }${viewsLine ? section("your portfolio", [viewsLine]) : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px;">
            ${button(feedUrl, "Open samehere")}
          </td>
        </tr>
        ${footerRow(
          `<p style="margin:0;font-size:13px;line-height:1.6;color:${INK_MUTED};"><a href="${unsubUrl}" style="color:${INK_MUTED};text-decoration:underline;">not useful? turn off the weekly email</a></p>`
        )}`);

  return { subject, text, html };
}
