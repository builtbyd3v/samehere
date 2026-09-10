import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReferralShareCard from "@/components/referrals/ReferralShareCard";
import { SITE_URL } from "@/lib/site";
import { referralStatsFromRpc } from "@/lib/referrals";

export default async function ReferralsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("get_referral_stats");
  const stats = referralStatsFromRpc(data, error, user.id);

  return (
    <main className="page-enter mx-auto max-w-xl px-5 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">Invite friends</h1>
      <p className="mb-6 text-sm text-[var(--ink-muted)]">
        Share your link. A referral is qualified after that person is active on samehere. 50 qualified unlocks the
        Social Butterfly badge. 100 qualified unlocks a free semester of Pro.
      </p>
      {stats.status === "unavailable" ? (
        <div className="card p-5 sm:p-6">
          <p role="status" className="text-sm text-[var(--ink)]">
            Referral stats are unavailable right now.
          </p>
          <a href="/referrals" className="btn-primary mt-4 inline-flex">
            Try again
          </a>
        </div>
      ) : (
        <ReferralShareCard
          initialCode={stats.code}
          origin={SITE_URL}
          referralCount={stats.referralCount}
          pendingCount={stats.pendingCount}
          isCampusFounder={stats.isCampusFounder}
        />
      )}
    </main>
  );
}
