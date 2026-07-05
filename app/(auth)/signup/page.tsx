"use client";

import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm, { SignupFooter } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <AuthShell variant="signup" footer={<SignupFooter />}>
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
