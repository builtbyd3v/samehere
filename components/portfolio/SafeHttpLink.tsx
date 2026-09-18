import { httpUrlError } from "@/lib/portfolio/validation";
import { ExternalLink, Github } from "lucide-react";
import TrackedHttpLink from "./TrackedHttpLink";

function LinkIcon({ kind }: { kind: "repo" | "demo" }) {
  const Icon = kind === "repo" ? Github : ExternalLink;
  return <Icon strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />;
}

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
  const kind = track?.clickKind ?? (children === "Repository" ? "repo" : "demo");
  if (track) {
    return (
      <TrackedHttpLink href={href} projectId={track.projectId} clickKind={track.clickKind} className="project-link-pill">
        <LinkIcon kind={kind} />
        {children}
      </TrackedHttpLink>
    );
  }
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      className="project-link-pill"
    >
      <LinkIcon kind={kind} />
      {children}
    </a>
  );
}
