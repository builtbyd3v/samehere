type Props = {
  title: string;
  children: React.ReactNode;
};

export default function AuthCard({ title, children }: Props) {
  return (
    <div className="w-full max-w-md">
      <h1 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink)] sm:text-2xl">{title}</h1>
      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-paper sm:mt-6 sm:p-6 md:p-8">
        {children}
      </div>
    </div>
  );
}
