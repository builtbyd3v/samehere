type Props = {
  title: string;
  children: React.ReactNode;
};

export default function AuthCard({ title, children }: Props) {
  return (
    <div className="w-full max-w-md">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">{title}</h1>
      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-paper md:p-8">
        {children}
      </div>
    </div>
  );
}
