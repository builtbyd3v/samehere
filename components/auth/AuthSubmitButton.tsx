type Props = {
  pending: boolean;
  pendingLabel: string;
  children: React.ReactNode;
};

// Shared .btn-primary submit with a loading spinner — used by every auth form
// so the "front door" feels consistent between login/signup/reset/update.
export default function AuthSubmitButton({ pending, pendingLabel, children }: Props) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-md blur-lg"
        style={{ background: "var(--blue-glow)" }}
      />
      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full py-2.5 text-[15px]"
      >
      {pending && (
        <svg
          className="h-4 w-4 motion-safe:animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
        <span>{pending ? pendingLabel : children}</span>
      </button>
    </div>
  );
}
