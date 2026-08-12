/** Vendored Devicon paths under /public/tech-icons. */
const TECH_ICON_SRC: Record<string, string> = {
  typescript: "/tech-icons/typescript.svg",
  "next.js": "/tech-icons/nextjs.svg",
  nextjs: "/tech-icons/nextjs.svg",
  postgresql: "/tech-icons/postgresql.svg",
  postgres: "/tech-icons/postgresql.svg",
  "node.js": "/tech-icons/nodejs.svg",
  nodejs: "/tech-icons/nodejs.svg",
  node: "/tech-icons/nodejs.svg",
  git: "/tech-icons/git.svg",
};

function normalizeTechKey(label: string): string {
  return label.trim().toLowerCase();
}

/** Resolve a vendored icon path for a technology label, if one exists. */
export function resolveTechIconSrc(label: string): string | null {
  const key = normalizeTechKey(label);
  return TECH_ICON_SRC[key] ?? null;
}
