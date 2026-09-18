type Props = {
  title: string;
  children: React.ReactNode;
  shake?: boolean;
};

export default function AuthCard({ title, children, shake = false }: Props) {
  return (
    <div className={`w-full max-w-md${shake ? " auth-shake" : ""}`}>
      <h1 className="auth-card-title text-xl font-medium tracking-[-0.03em] text-[var(--ink)] sm:text-2xl">
        {title}
      </h1>
      <div className="auth-card-panel card-raised">{children}</div>
    </div>
  );
}
