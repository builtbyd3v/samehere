type Props = {
  pending: boolean;
  pendingLabel: string;
  children: React.ReactNode;
};

export default function AuthSubmitButton({ pending, pendingLabel, children }: Props) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full py-2 text-[15px] sm:py-2.5"
    >
      {pending ? (
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
      ) : null}
      <span>{pending ? pendingLabel : children}</span>
    </button>
  );
}
