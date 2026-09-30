import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonShape = "pill" | "rounded";

type Style = { variant?: ButtonVariant; size?: ButtonSize; shape?: ButtonShape; className?: string };
type LinkButtonProps = Style & Omit<ComponentProps<typeof Link>, "className">;
type NativeButtonProps = Style & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & { href?: undefined };
export type ButtonProps = LinkButtonProps | NativeButtonProps;

// Transitions come from the global `a, button` rule in app/globals.css (unlayered,
// so Tailwind transition utilities would lose to it anyway).
const BASE =
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium active:scale-[0.96] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-[var(--ink)] font-semibold text-[var(--bg)] hover:bg-[var(--ink-2)]",
  secondary: "border border-[var(--hairline-strong)] bg-white/[0.04] text-[var(--ink)] hover:bg-white/[0.07]",
  ghost: "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--ink)]",
  outline: "border border-[var(--hairline-strong)] text-[var(--ink)] hover:border-white/25",
};

// sm and md keep a 44px hit area with an invisible ::before (DESIGN.md, touch targets).
const SIZE: Record<ButtonSize, string> = {
  sm: "h-7 px-3 text-xs before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']",
  md: "h-9 px-4 text-sm before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
  lg: "h-[52px] px-6 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", shape: ButtonShape = "pill"): string {
  return `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${shape === "pill" ? "rounded-full" : "rounded-xl"}`;
}

function isLink(props: ButtonProps): props is LinkButtonProps {
  return props.href !== undefined;
}

/** The one button. `href` renders a next/link; otherwise a native button (type defaults to "button"). */
export function Button(props: ButtonProps) {
  if (isLink(props)) {
    const { variant, size, shape, className = "", ...rest } = props;
    return <Link {...rest} className={`${buttonClass(variant, size, shape)} ${className}`.trim()} />;
  }
  const { variant, size, shape, className = "", type = "button", ...rest } = props;
  return <button {...rest} type={type} className={`${buttonClass(variant, size, shape)} ${className}`.trim()} />;
}
