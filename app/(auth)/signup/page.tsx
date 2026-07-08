import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm, { SignupFooter } from "@/components/auth/SignupForm";
import SignupAside from "@/components/auth/SignupAside";
import { getFounderSpotsLeft } from "@/lib/founder";

export default async function SignupPage() {
  const spotsLeft = await getFounderSpotsLeft();
  return (
    <AuthShell variant="signup" footer={<SignupFooter />} aside={<SignupAside spotsLeft={spotsLeft} />}>
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
