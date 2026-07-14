import AuthShell from "@/components/auth/AuthShell";
import LoginForm, { LoginFooter } from "@/components/auth/LoginForm";

// Server component so it can read INVITE_ONLY: during the invite-only beta
// the OAuth buttons are hidden here too — a first provider login would
// auto-create an account, skipping the invite-code check in signUp.
export default function LoginPage() {
  return (
    <AuthShell variant="login" footer={<LoginFooter />}>
      <LoginForm inviteOnly={process.env.INVITE_ONLY === "1"} />
    </AuthShell>
  );
}
