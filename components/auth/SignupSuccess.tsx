import Link from "next/link";
import AuthCard from "./AuthCard";
import { authHint } from "./auth-fields";

type Props = {
  email: string;
};

export default function SignupSuccess({ email }: Props) {
  return (
    <AuthCard title="Check your email">
      <p className="text-[15px] leading-relaxed text-[var(--ink-muted)]">
        We sent a confirmation link to{" "}
        <span className="font-medium text-[var(--ink)]">{email}</span>. Click it to activate your
        account.
      </p>
      <p className={`${authHint} mt-4`}>
        Wrong address or nothing arrived?{" "}
        <Link href="/signup" className="text-[var(--ink)] underline">
          Start over
        </Link>
        .
      </p>
    </AuthCard>
  );
}
