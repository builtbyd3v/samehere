import Link from "next/link";
import { MANUAL_PROJECT_PATH } from "@/lib/github/config";

export default function GithubImportHint() {
  return (
    <p className="mt-3 text-sm text-[var(--ink-faint)]">
      <Link href={MANUAL_PROJECT_PATH} className="underline">
        Connect GitHub
      </Link>{" "}
      to import a public repository. Manual drafts still work if GitHub is unavailable.
    </p>
  );
}
