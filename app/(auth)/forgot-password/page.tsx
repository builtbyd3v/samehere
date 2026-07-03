"use client";

import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm, { ForgotPasswordFooter } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthShell variant="forgot" footer={<ForgotPasswordFooter />}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
