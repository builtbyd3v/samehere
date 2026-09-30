type Props = {
  title: string;
  children: React.ReactNode;
  shake?: boolean;
};

export default function AuthCard({ title, children, shake = false }: Props) {
  return (
    <div className={`w-full max-w-md${shake ? " auth-shake" : ""}`}>
      <h2 className="auth-card-title text-section font-semibold text-[var(--ink)]">{title}</h2>
      <div className="auth-card-panel rounded-[20px] border border-[var(--border)] bg-[var(--surface-3)]">{children}</div>
    </div>
  );
}
