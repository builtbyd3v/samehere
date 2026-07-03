"use client";

import AuthShell from "@/components/auth/AuthShell";
import SignupForm, { SignupFooter } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <AuthShell variant="signup" footer={<SignupFooter />}>
      <SignupForm />
    </AuthShell>
  );
}
