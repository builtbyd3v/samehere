"use client";

import { useEffect, useRef, useState } from "react";
import { searchSchools, type School } from "@/lib/schools";

// Module-level cache so the ~177KB list is fetched at most once per session,
// lazily on first focus — it never ships in the JS bundle.
let cache: School[] | null = null;
let inflight: Promise<School[]> | null = null;

function loadSchools(): Promise<School[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/us_schools.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: School[]) => (cache = data))
      .catch(() => []);
  }
  return inflight;
}

// Autocomplete for the profile "School" field. It's a plain text input
// (name={name}) with a suggestion dropdown, so free-text still submits normally
// for schools not in the list.
export default function SchoolAutocomplete({
  name,
  id,
  defaultValue,
  placeholder,
  maxLength,
  className,
  domainName,
  defaultDomain,
  onChoose,
}: {
  name: string;
  id?: string;
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  domainName?: string;
  defaultDomain?: string;
  onChoose?: (school: School) => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [list, setList] = useState<School[]>([]);
  const [results, setResults] = useState<School[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Seed from the saved domain so editing an entry without re-picking the
  // school keeps its logo. Cleared only when the user hand-edits the name.
  const [domain, setDomain] = useState(defaultDomain ?? "");
  const wrapRef = useRef<HTMLDivElement>(null);

  function update(next: string, loaded = list) {
    setValue(next);
    setResults(searchSchools(next, loaded));
    setActive(-1);
    setOpen(true);
    setDomain("");
  }

  function choose(school: School) {
    setValue(school.name);
    setOpen(false);
    setActive(-1);
    setDomain(school.domains?.[0] ?? "");
    onChoose?.(school);
  }

  // Close when clicking outside.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      {domainName && <input type="hidden" name={domainName} value={domain} />}
      <input
        id={id}
        name={name}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        className={className}
        onFocus={() => loadSchools().then((s) => { setList(s); if (value) setResults(searchSchools(value, s)); })}
        onChange={(e) => update(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface-card)] py-1 shadow-lg"
        >
          {results.map((s, i) => (
            <li key={s.name} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition ${
                  i === active ? "bg-[var(--featured-surface)]" : "hover:bg-[var(--featured-surface)]"
                }`}
              >
                <span className="truncate text-[var(--ink)]">{s.name}</span>
                <span className="shrink-0 text-xs text-[var(--ink-faint)]">{s.ac}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
