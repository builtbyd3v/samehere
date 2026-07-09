import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReferralShareCard from "@/components/referrals/ReferralShareCard";
import { SITE_URL } from "@/lib/site";

export default async function ReferralsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.rpc("get_referral_stats");
  const stats = data?.[0] ?? { code: user.id.slice(0, 8), referral_count: 0, is_campus_founder: false };

  const origin = SITE_URL;

  return (
    <main className="page-enter mx-auto max-w-xl px-5 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">Invite friends</h1>
      <p className="mb-6 text-sm text-[var(--ink-muted)]">
        Share your link. Reach 100 referrals and earn the Social Butterfly badge.
      </p>
      <ReferralShareCard
        initialCode={stats.code}
        origin={origin}
        referralCount={stats.referral_count}
        isCampusFounder={stats.is_campus_founder}
      />
    </main>
  );
}
