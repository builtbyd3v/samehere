import { Github, Globe, Linkedin } from "lucide-react";
import { httpUrlError } from "@/lib/portfolio/validation";

type ResumeLinksProps = { github: string | null; linkedin: string | null; website: string | null };

const LINKS = [
  { key: "github", label: "GitHub", Icon: Github },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { key: "website", label: "Website", Icon: Globe },
] as const;

export default function ResumeLinks(props: ResumeLinksProps) {
  const items = LINKS.flatMap((link) => {
    const href = props[link.key];
    return href && !httpUrlError(link.label, href) ? [{ ...link, href }] : [];
  });
  if (items.length === 0) return null;
  return (
    <ul className="mt-2 flex items-center gap-1" aria-label="Links">
      {items.map(({ key, label, Icon, href }) => (
        <li key={key}>
          <a
            href={href}
            target="_blank"
            rel="me noopener noreferrer"
            aria-label={label}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--ink-muted)] hover:bg-[var(--featured-surface)] hover:text-[var(--ink)]"
          >
            <Icon strokeWidth={1.5} className="h-[18px] w-[18px]" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}
