import { CircleAlert, CircleCheck, Info } from "lucide-react";

type Variant = "error" | "success" | "info";

type Props = {
  message: string;
  variant?: Variant;
};

const ICONS = {
  error: CircleAlert,
  success: CircleCheck,
  info: Info,
} as const;

const VARIANT_STYLES: Record<Variant, string> = {
  error: "border-[var(--danger)]/40 bg-[var(--danger)]/[0.06] text-[var(--ink)] [&_svg]:text-[var(--danger)]",
  success: "border-emerald-400/40 bg-emerald-500/[0.06] text-[var(--ink)] [&_svg]:text-emerald-500",
  info: "border-[var(--blue)]/30 bg-[var(--blue)]/[0.06] text-[var(--ink)] [&_svg]:text-[var(--blue)]",
};

export default function AuthAlert({ message, variant = "error" }: Props) {
  const Icon = ICONS[variant];
  return (
    <p
      role={variant === "error" ? "alert" : "status"}
      className={`mb-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm leading-snug ${VARIANT_STYLES[variant]}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" size={16} strokeWidth={1.5} aria-hidden />
      <span>{message}</span>
    </p>
  );
}
