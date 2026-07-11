// HMAC unsubscribe tokens, no login required to click the link. Pure
// functions so they're unit-testable without a request/DB round trip.
import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.EMAIL_UNSUB_SECRET;
  if (!s) throw new Error("EMAIL_UNSUB_SECRET is not set");
  return s;
}

function sign(userId: string): string {
  return createHmac("sha256", secret()).update(userId).digest("hex");
}

export function makeUnsubToken(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

// Returns the userId on a valid, untampered token; null otherwise.
export function verifyUnsubToken(token: string): string | null {
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;

  const userId = token.slice(0, dot);
  const providedHmac = token.slice(dot + 1);
  const expectedHmac = sign(userId);

  const a = Buffer.from(providedHmac);
  const b = Buffer.from(expectedHmac);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return userId;
}
