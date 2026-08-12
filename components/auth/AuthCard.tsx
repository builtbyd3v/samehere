type Props = {
  title: string;
  children: React.ReactNode;
};

export default function AuthCard({ title, children }: Props) {
  return (
    <div className="w-full max-w-md">
      <h1 className="text-xl font-medium tracking-[-0.02em] text-[var(--ink)] sm:text-2xl">
        {title}
      </h1>
      <div className="mt-4 rounded-[var(--landing-radius,0.75rem)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:mt-6 sm:p-6 md:p-8">
        {children}
      </div>
    </div>
  );
}
