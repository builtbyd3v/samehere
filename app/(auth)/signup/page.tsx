import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm, { SignupFooter } from "@/components/auth/SignupForm";
import SignupReassurance, { SignupFounderPill } from "@/components/auth/SignupAside";
import { getFounderSpotsLeft } from "@/lib/founder";

export default async function SignupPage() {
  const spotsLeft = await getFounderSpotsLeft();
  return (
    <AuthShell
      variant="signup"
      footer={<SignupFooter />}
      aside={<SignupFounderPill spotsLeft={spotsLeft} />}
      asideExtra={<SignupReassurance />}
    >
      <Suspense fallback={null}>
        <SignupForm inviteOnly={process.env.INVITE_ONLY === "1"} />
      </Suspense>
    </AuthShell>
  );
}
