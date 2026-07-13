"use client";

import { useState } from "react";
import Menu, { useMenuClose } from "@/components/ui/Menu";

// Custom select: Menu popover styled like the rest of the product, replacing
// native <select> popups. Works controlled (value + onChange) or uncontrolled
// (defaultValue); pass `name` to carry the value in a plain <form> post via a
// hidden input. Options are flat {value, label} pairs.

export type SelectOption = { value: string; label: string };

const TRIGGER =
  "h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[#3b82f6]/40";

function OptionRow({
  option,
  selected,
  onPick,
}: {
  option: SelectOption;
  selected: boolean;
  onPick: (v: string) => void;
}) {
  const close = useMenuClose();
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={() => {
        close?.();
        onPick(option.value);
      }}
      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-[var(--featured-surface)] ${
        selected ? "font-medium text-[var(--blue)]" : "text-[var(--ink)]"
      }`}
    >
      <span className="truncate">{option.label}</span>
      {selected && (
        <svg aria-hidden viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="m5 12 5 5L20 7" />
        </svg>
      )}
    </button>
  );
}

export default function Select({
  options,
  value: valueProp,
  defaultValue,
  onChange,
  name,
  ariaLabel,
  disabled = false,
  className = "",
}: {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  ariaLabel?: string;
  disabled?: boolean;
  /** Extra classes for the trigger button (e.g. width overrides). */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(defaultValue ?? options[0]?.value ?? "");
  const value = valueProp ?? internal;
  const current = options.find((o) => o.value === value) ?? options[0];

  function pick(v: string) {
    if (valueProp === undefined) setInternal(v);
    onChange?.(v);
  }

  return (
    <>
      {name && <input type="hidden" name={name} value={value} />}
      <Menu
        align="start"
        fullWidth
        customTrigger
        open={open}
        onOpenChange={setOpen}
        trigger={
          <button
            type="button"
            aria-label={ariaLabel}
            disabled={disabled}
            onClick={() => setOpen(!open)}
            className={`${TRIGGER} inline-flex w-full items-center justify-between gap-2 disabled:opacity-50 ${className}`}
          >
            <span className="truncate">{current?.label ?? ""}</span>
            <svg aria-hidden viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--ink-faint)]">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        }
      >
        {options.map((o) => (
          <OptionRow key={o.value} option={o} selected={o.value === value} onPick={pick} />
        ))}
      </Menu>
    </>
  );
}
