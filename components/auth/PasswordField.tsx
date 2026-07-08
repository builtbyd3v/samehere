"use client";

import { useState } from "react";
import { authInput, authInputError } from "./auth-fields";

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

type Props = {
  id: string;
  name: string;
  autoComplete: string;
  placeholder: string;
  hasError?: boolean;
  minLength?: number;
  required?: boolean;
};

export default function PasswordField({
  id,
  name,
  autoComplete,
  placeholder,
  hasError = false,
  minLength,
  required = true,
}: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative mt-1.5">
      <input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        aria-invalid={hasError}
        className={`${hasError ? authInputError : authInput} !mt-0 pr-11`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[var(--ink-muted)] transition hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
        tabIndex={-1}
      >
        <EyeIcon off={show} />
      </button>
    </div>
  );
}
