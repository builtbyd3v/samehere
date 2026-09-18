"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { authInput, authInputError } from "./auth-fields";

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
        className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-md text-[var(--ink-muted)] transition hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
        tabIndex={-1}
      >
        {show ? <EyeOff size={18} strokeWidth={1.5} aria-hidden /> : <Eye size={18} strokeWidth={1.5} aria-hidden />}
      </button>
    </div>
  );
}
