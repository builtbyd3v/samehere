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
