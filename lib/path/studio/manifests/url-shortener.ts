import type { StudioManifest } from "@/lib/path/types";

/**
 * Read-only Wave 1 starter for URL Shortener API.
 * Scaffolding only — TODOs and acceptance hooks, not a completed solution.
 * Runtime is remote_node: not runnable in classic Sandpack.
 */
export const URL_SHORTENER_STUDIO_MANIFEST = {
  version: 1,
  runtime: "remote_node",
  language: "TypeScript",
  technologies: ["TypeScript", "Next.js", "PostgreSQL", "Node.js", "Git"],
  entryFile: "app/page.tsx",
  visibleFiles: [
    "README.md",
    "package.json",
    "tsconfig.json",
    "sql/schema.sql",
    "lib/db.ts",
    "lib/links.ts",
    "app/layout.tsx",
    "app/page.tsx",
    "app/api/shorten/route.ts",
    "app/r/[code]/route.ts",
  ],
  starterFiles: [
    {
      path: "README.md",
      readOnly: true,
      code: `# URL Shortener API

Build a small Next.js + Postgres service that shortens URLs and redirects.

## Problem
Map long URLs to short codes, then 302-redirect and count clicks.

## API (target)
- \`POST /api/shorten\` — body \`{ "url": "https://..." }\` → \`{ "code", "shortUrl" }\`
- \`GET /r/[code]\` — redirect to the original URL (or 404)

## Schema
See \`sql/schema.sql\`. Keep \`short_code\` unique.

## Tradeoffs
Document code length, collision handling, and click-count consistency in your README bullets when you finish.
`,
    },
    {
      path: "package.json",
      readOnly: true,
      code: `{
  "name": "url-shortener",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "16.2.9",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "pg": "^8.16.3"
  },
  "devDependencies": {
    "typescript": "^5.9.2",
    "@types/node": "^24.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "vitest": "^4.1.10"
  }
}
`,
    },
    {
      path: "tsconfig.json",
      readOnly: true,
      code: `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "noEmit": true,
    "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
`,
    },
    {
      path: "sql/schema.sql",
      code: `-- TODO(schema): create links table with unique short_code
-- Acceptance: original_url, short_code (unique), created_at, click_count

-- CREATE TABLE links (
--   id            bigserial PRIMARY KEY,
--   original_url  text NOT NULL,
--   short_code    text NOT NULL UNIQUE,
--   created_at    timestamptz NOT NULL DEFAULT now(),
--   click_count   integer NOT NULL DEFAULT 0
-- );
`,
    },
    {
      path: "lib/db.ts",
      code: `// TODO: wire a Postgres client from DATABASE_URL.
// Keep credentials out of client components.

export type DbClient = {
  query: <T = unknown>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }>;
};

export function getDb(): DbClient {
  throw new Error("TODO: implement getDb()");
}
`,
    },
    {
      path: "lib/links.ts",
      code: `// Shared link helpers — implement as you clear checklist items.

export function isValidHttpUrl(value: string): boolean {
  // TODO(errors): reject non-http(s) and malformed URLs
  void value;
  return false;
}

export function generateShortCode(): string {
  // TODO(schema): URL-safe unique codes (length + alphabet are your call)
  throw new Error("TODO: implement generateShortCode()");
}

export type LinkRow = {
  original_url: string;
  short_code: string;
  created_at: string;
  click_count: number;
};
`,
    },
    {
      path: "app/layout.tsx",
      readOnly: true,
      code: `import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: "2rem" }}>
        {children}
      </body>
    </html>
  );
}
`,
    },
    {
      path: "app/page.tsx",
      code: `// TODO(list): list created links with click counts for a live demo.
// Acceptance: after shortening, the new row appears with clicks starting at 0.

export default function HomePage() {
  return (
    <main>
      <h1>URL Shortener</h1>
      <p>Implement POST /api/shorten, GET /r/[code], then this list UI.</p>
      {/* TODO: form to submit a URL + table of links */}
    </main>
  );
}
`,
    },
    {
      path: "app/api/shorten/route.ts",
      code: `import { NextResponse } from "next/server";

// TODO(shorten): validate URL, insert row, return public short URL.
// Acceptance: valid URL → 201 with { code, shortUrl }; invalid → clean 400.

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    { error: "TODO: implement POST /api/shorten" },
    { status: 501 },
  );
}
`,
    },
    {
      path: "app/r/[code]/route.ts",
      code: `import { NextResponse } from "next/server";

// TODO(redirect): lookup code, increment clicks, 302 to original_url.
// Acceptance: known code redirects; unknown code → clean 404 (no internals).

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;
  void code;
  return NextResponse.json(
    { error: "TODO: implement GET /r/[code]" },
    { status: 501 },
  );
}
`,
    },
  ],
  milestones: [
    {
      id: "m-schema",
      checklistId: "schema",
      title: "Create links table with unique short_code",
      acceptance: [
        "links table exists with original_url, short_code, created_at, click_count",
        "short_code has a uniqueness constraint",
      ],
    },
    {
      id: "m-shorten",
      checklistId: "shorten",
      title: "Implement POST /api/shorten with URL validation",
      acceptance: [
        "Valid http(s) URLs insert a row and return code + shortUrl",
        "Invalid URLs return a clear 400 without writing",
      ],
    },
    {
      id: "m-redirect",
      checklistId: "redirect",
      title: "Implement GET /r/[code] redirect + click increment",
      acceptance: [
        "Known codes 302 to the original URL",
        "click_count increments once per successful redirect",
      ],
    },
    {
      id: "m-list",
      checklistId: "list",
      title: "Build a simple list UI of created links",
      acceptance: [
        "Home page lists short codes with original URLs and click counts",
        "A newly shortened link appears without a full redeploy story",
      ],
    },
    {
      id: "m-errors",
      checklistId: "errors",
      title: "Handle invalid URLs and missing codes cleanly",
      acceptance: [
        "Invalid shorten payloads do not leak stack traces",
        "Unknown redirect codes return 404 with a safe body",
      ],
    },
    {
      id: "m-readme",
      checklistId: "readme",
      title: "Write a 5-bullet README: problem, API, schema, tradeoffs",
      acceptance: [
        "README covers problem, API, schema, and at least one tradeoff",
      ],
    },
  ],
  commands: {
    preview: "npm run dev",
    visibleTests: "npm test",
    submission: "npm test",
  },
} satisfies StudioManifest;
