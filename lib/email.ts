// ponytail: one fetch; SDK when we need more than send.
const RESEND_URL = "https://api.resend.com/emails";
const FROM = "samehere <verify@samehere.dev>";

export async function sendEmail({
  to,
  subject,
  text,
  html,
  from,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}): Promise<void> {
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: from ?? FROM, to, subject, text, ...(html ? { html } : {}) }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`sendEmail failed (${res.status}): ${body}`);
  }
}
