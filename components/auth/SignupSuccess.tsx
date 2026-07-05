import Link from "next/link";
import AuthAlert from "./AuthAlert";
import AuthCard from "./AuthCard";
import { authHint } from "./auth-fields";

type Props = {
  email: string;
};

export default function SignupSuccess({ email }: Props) {
  return (
    <AuthCard title="Check your email">
      <AuthAlert
        variant="success"
        message={`We sent a confirmation link to ${email}. Click it to activate your account.`}
      />
      <p className={authHint}>
        Wrong address or nothing arrived?{" "}
        <Link href="/signup" className="text-[var(--ink)] underline">
          Start over
        </Link>
        .
      </p>
    </AuthCard>
  );
}
