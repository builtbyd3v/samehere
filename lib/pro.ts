import type { Tables } from "@/types/database.types";

// is_pro is the grant flag; pro_until is when it lapses. The nightly pg_cron sweep
// (expire_lapsed_pro) flips is_pro off for lapsed one-time buyers, but a missed run
// would otherwise leave Pro on forever. Checking pro_until here makes the flag and
// the timestamp unable to disagree — a missed sweep degrades to "Pro ends on time".
// pro_until === null = a comped/manual grant that never expires.
export const isPro = (p: Pick<Tables<"profiles">, "is_pro" | "pro_until">) =>
  p.is_pro === true && (p.pro_until === null || new Date(p.pro_until) > new Date());
