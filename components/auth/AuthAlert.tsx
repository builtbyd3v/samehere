type Variant = "error" | "success" | "info";

type Props = {
  message: string;
  variant?: Variant;
};

const ICON_PATH: Record<Variant, string> = {
  error: "M12 8v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
  success: "M20 6 9 17l-5-5",
  info: "M12 16v-4m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
};

const VARIANT_STYLES: Record<Variant, string> = {
  error: "border-[var(--danger)]/40 bg-[var(--danger)]/[0.06] text-[var(--ink)] [&_svg]:text-[var(--danger)]",
  success: "border-emerald-400/40 bg-emerald-500/[0.06] text-[var(--ink)] [&_svg]:text-emerald-500",
  info: "border-[var(--blue)]/30 bg-[var(--blue)]/[0.06] text-[var(--ink)] [&_svg]:text-[var(--blue)]",
};

export default function AuthAlert({ message, variant = "error" }: Props) {
  return (
    <p
      role={variant === "error" ? "alert" : "status"}
      className={`mb-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm leading-snug ${VARIANT_STYLES[variant]}`}
    >
      <svg
        className="mt-0.5 h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={ICON_PATH[variant]} />
      </svg>
      <span>{message}</span>
    </p>
  );
}
