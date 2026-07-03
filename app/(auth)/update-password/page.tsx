"use client";

import AuthShell from "@/components/auth/AuthShell";
import UpdatePasswordForm, { UpdatePasswordFooter } from "@/components/auth/UpdatePasswordForm";

export default function UpdatePasswordPage() {
  return (
    <AuthShell variant="updatePassword" footer={<UpdatePasswordFooter />}>
      <UpdatePasswordForm />
    </AuthShell>
  );
}
