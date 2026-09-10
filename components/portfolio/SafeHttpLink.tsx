import { httpUrlError } from "@/lib/portfolio/validation";
import { ExternalLink } from "lucide-react";
import TrackedHttpLink from "./TrackedHttpLink";

export default function SafeHttpLink({
  href,
  children,
  track,
}: {
  href: string | null;
  children: string;
  track?: { projectId: string; clickKind: "repo" | "demo" };
}) {
  if (!href || httpUrlError("Link", href)) return null;
  if (track) {
    return (
      <TrackedHttpLink href={href} projectId={track.projectId} clickKind={track.clickKind}>
        {children}
      </TrackedHttpLink>
    );
  }
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      className="inline-flex items-center gap-1 text-sm text-[var(--blue)] underline-offset-2 hover:underline"
    >
      {children}
      <ExternalLink strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
    </a>
  );
}
