export type ReferralStatsRow = {
  code: string;
  referral_count: number;
  pending_count: number;
  is_campus_founder: boolean;
};

export type ReferralStatsState =
  | { status: "unavailable" }
  | {
      status: "ok";
      code: string;
      referralCount: number;
      pendingCount: number;
      isCampusFounder: boolean;
    };

export async function copyText(
  text: string,
  clipboard?: { writeText: (value: string) => Promise<void> }
): Promise<boolean> {
  try {
    const target = clipboard ?? (typeof navigator !== "undefined" ? navigator.clipboard : undefined);
    if (!target?.writeText) return false;
    await target.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function referralStatsFromRpc(
  data: ReferralStatsRow[] | null | undefined,
  error: { message?: string } | null | undefined,
  _userId: string
): ReferralStatsState {
  const row = data?.[0];
  if (error || !row?.code) return { status: "unavailable" };
  return {
    status: "ok",
    code: row.code,
    referralCount: row.referral_count,
    pendingCount: row.pending_count,
    isCampusFounder: row.is_campus_founder,
  };
}

/** Referral codes and usernames share one shape. Anything else is dropped, never an error. */
export function parseRef(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  return /^[a-z0-9_]{3,20}$/.test(v) ? v : null;
}

/** Short-lived cookie that carries ?ref through an OAuth round trip (plan 016 Step 6). */
export const REF_COOKIE = "sh_ref";

export type RewardProgressRow = { ready: number; rewards: number };

/** One quiet line for /referrals. Null (render nothing) when the RPC failed or returned no row. */
export function referralRewardLine(row: RewardProgressRow | null | undefined): string | null {
  if (!row) return null;
  const ready = Math.min(row.ready, 3);
  const earned = row.rewards > 0 ? ` Months earned so far: ${row.rewards}.` : "";
  return `${ready} of 3 invited friends have set their stage.${earned}`;
}
