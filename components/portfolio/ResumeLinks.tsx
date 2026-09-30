import { httpUrlError } from "@/lib/portfolio/validation";

type ResumeLinksProps = { github: string | null; linkedin: string | null; website: string | null };

const LINKS = [
  { key: "github", label: "GitHub" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "website", label: "Website" },
] as const;

export default function ResumeLinks(props: ResumeLinksProps) {
  const items = LINKS.flatMap((link) => {
    const href = props[link.key];
    // Safe to parse: httpUrlError already accepted the URL.
    return href && !httpUrlError(link.label, href)
      ? [{ ...link, href, host: new URL(href).hostname.replace(/^www\./, "") }]
      : [];
  });
  if (items.length === 0) return null;
  return (
    <ul aria-label="Links" className="flex flex-col">
      {items.map(({ key, label, href, host }) => (
        <li key={key}>
          <a
            href={href}
            target="_blank"
            rel="me noopener noreferrer"
            className="flex h-11 items-center justify-between gap-4 border-b border-white/5 text-sm text-[var(--ink-3)] hover:text-[var(--ink)] md:h-9"
          >
            <span>{label}</span>
            <span className="min-w-0 truncate text-xs text-[var(--faint)]">{host}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
