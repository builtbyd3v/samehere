import AuthAlert from "./AuthAlert";
import AuthCard from "./AuthCard";
import { authHint } from "./auth-fields";

type Props = {
  email: string;
};

export default function SignupSuccess({ email }: Props) {
  return (
    <AuthCard title="Check your email">
      <div className="animate-[modal-in_200ms_var(--ease-out)] motion-reduce:animate-none">
        <AuthAlert
          variant="success"
          message={`We sent a confirmation link to ${email}. Click it to activate your account.`}
        />
        <p className={authHint}>
          Wrong address or nothing arrived?{" "}
          {/* Plain <a> (not next/link): a client-side nav back to /signup keeps the
              success state in useActionState, so the form never re-renders. A full
              reload remounts SignupForm with empty state. */}
          <a href="/signup" className="text-[var(--ink)] underline">
            Start over
          </a>
          .
        </p>
      </div>
    </AuthCard>
  );
}
