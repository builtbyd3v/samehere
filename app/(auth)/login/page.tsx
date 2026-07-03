"use client";

import AuthShell from "@/components/auth/AuthShell";
import LoginForm, { LoginFooter } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell variant="login" footer={<LoginFooter />}>
      <LoginForm />
    </AuthShell>
  );
}
