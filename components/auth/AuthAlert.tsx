type Props = {
  message: string;
};

export default function AuthAlert({ message }: Props) {
  return (
    <p
      role="alert"
      className="mb-4 rounded-md border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--ink)]"
    >
      {message}
    </p>
  );
}
