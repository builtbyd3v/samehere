# Project Studio implementation plan

Last updated: 2026-08-12

## 1. Product goal

Turn assigned path projects into a visual, in-app build environment with real
files, tests, preview evidence, and dossier write-back. The studio must remain
part of the adaptive path. It must not become a project catalog, generic cloud
IDE, or external tutorial launcher.

The first useful version should make one assigned project feel tangible before
adding code execution:

- Real language and framework marks
- Compact brief and milestone rail
- Versioned starter files
- File explorer and code viewer
- Preview and test regions with honest empty states
- Existing checklist progress and dossier flow preserved

## 2. Locked decisions

- Five fixed UI recipes remain the only path layouts.
- `/projects/[slug]` remains the assigned-project route. No project mall.
- Monaco is the desktop editor in the editable phase. Mobile does not pretend
  Monaco works; it gets Brief, Preview, Checks, and read-only code.
- DSA defaults to Python. An explicit language choice persists for later
  problems. Project language remains independent.
- Classic Sandpack is allowed only for curated browser-compatible React and
  TypeScript projects. Do not use Nodebox-backed Next.js or Vite templates
  without resolving their separate commercial terms.
- Existing full-stack projects such as URL Shortener API require a remote
  runtime. They must not be presented as runnable in classic Sandpack.
- Vercel Sandbox is the authoritative isolated runner for hidden tests and,
  later, full-stack or non-JavaScript projects.
- WebContainers are deferred. Commercial licensing, COOP/COEP requirements,
  desktop browser assumptions, and Node-only scope make them a poor default.
- Supabase is the durable source of workspace files and verified results.
  Sandbox snapshots are disposable caches.
- Re-diagnosis consumes explicit evidence such as tests passed, repeated
  failures, hint requests, and milestone completion. It never consumes raw
  keystrokes, typing speed, or idle time.

## 3. Target architecture

```text
Assigned path project
  -> Project Studio
     -> brief + milestones
     -> file tree + editor/viewer
     -> preview + tests + console
     -> canonical workspace revisions in Supabase
     -> runtime adapter
        -> classic Sandpack for browser projects
        -> Vercel Sandbox for full-stack and authoritative tests
     -> verified evidence
     -> path re-diagnosis + dossier proof
```

Keep runtime interfaces separate:

```ts
interface ProjectRuntimeAdapter {
  open(revisionId: string): Promise<RuntimeLease>;
  apply(lease: RuntimeLease, revisionId: string): Promise<void>;
  startPreview(lease: RuntimeLease): Promise<Preview>;
  runVisibleTests(lease: RuntimeLease): AsyncIterable<ExecutionEvent>;
  stop(lease: RuntimeLease): Promise<void>;
}

interface SubmissionRunnerAdapter {
  submit(input: SubmissionRequest): Promise<RunReference>;
  result(run: RunReference): Promise<NormalizedResult>;
  cancel(run: RunReference): Promise<void>;
}
```

The browser never sends arbitrary shell commands. It sends a workspace revision,
template version, approved command id, language, and bounded resource profile.

## 4. Studio manifest contract

Add an optional studio manifest beside the curated `PathProject` content:

```ts
type StudioRuntime = "browser_react" | "remote_node";

type StudioManifest = {
  version: number;
  runtime: StudioRuntime;
  language: string;
  technologies: string[];
  entryFile: string;
  visibleFiles: string[];
  starterFiles: {
    path: string;
    code: string;
    readOnly?: boolean;
  }[];
  milestones: {
    id: string;
    checklistId: string;
    title: string;
    acceptance: string[];
    testIds?: string[];
  }[];
  commands: {
    preview?: string;
    visibleTests?: string;
    submission?: string;
  };
};
```

Manifest files are curated application code in the first release. The DB
catalog continues to validate published assignment slugs. Catalog unification
must happen before remotely-authored project manifests are allowed.

## 5. Persistence model

Keep `user_projects` as the assignment/progress summary.

Wave 1 adds:

```text
project_workspaces
  id
  user_id
  user_project_id
  template_version
  revision
  active_file
  created_at
  updated_at

project_workspace_files
  id
  user_id
  workspace_id
  path
  content
  revision
  created_at
  updated_at
```

Requirements:

- Owner-only RLS
- Composite same-owner foreign keys
- Unique workspace per `user_projects` row
- Unique path per workspace
- File path, count, individual size, and total workspace size limits
- Optimistic revision checks
- SQL tests for owner access, cross-user denial, forged ownership, and anon
  denial

Later waves add append-only `project_runs`, `project_artifacts`, and
`dsa_attempts`.

## 6. Visual system

Use official Devicon assets for actual technologies. Vendor only the allowlisted
SVG files used by the product and retain the upstream license.

Initial allowlist:

- TypeScript
- JavaScript
- Python
- Java
- C++
- Go
- React
- Next.js
- Node.js
- PostgreSQL
- Git
- Docker

Icons always keep a visible label or accessible name. Concepts without a real
logo, such as REST or authentication, remain text tags.

Desktop studio:

```text
Toolbar: title, technology marks, required-check status
Left: milestone rail and current acceptance criteria
Center: file tree and code surface
Right: preview, tests, console
Bottom: evidence drawer
```

Mobile studio:

- Tabs: Build, Files, Preview, Evidence
- Read-only highlighted code
- No Monaco
- Clear "Continue on desktop" handoff for editing
- No horizontal workspace scaled into a phone viewport

## 7. Delivery waves

### Wave 1: studio foundation

Deliver:

- `StudioManifest` types and validation
- Versioned URL Shortener starter manifest marked `remote_node`
- Official technology icon mapping and assets
- Owner-only workspace/file schema and RLS tests
- Read-only visual studio shell on `/projects/[slug]`
- Interactive file selection
- Honest Preview and Tests empty states
- Existing checklist and dossier completion preserved

No editor dependency and no execution in this wave.

Acceptance:

- URL Shortener opens as a recognizable TypeScript/Next/PostgreSQL workspace
- File selection changes the visible source without navigation
- Preview never displays a fake app
- Existing checklist progress still saves
- Existing completion and dossier write-back still work
- Desktop and 390px mobile layouts are usable

### Wave 2: browser project pilot

Deliver:

- Monaco desktop editor
- Debounced canonical file checkpoints with revision conflicts
- One intentionally browser-compatible React/TypeScript project
- Monaco state drives classic Sandpack preview one way
- Visible tests and console
- Loading, error, reset, and unsynced states

Do not route existing Next.js/Postgres projects through Sandpack.

### Wave 3: authoritative execution

Deliver:

- `project_runs` and normalized result contract
- Non-persistent Vercel Sandbox hidden-test evaluator
- Fixed commands, one vCPU, short timeout, output cap, deny-all network during
  student execution
- No Supabase or production credentials in the sandbox
- Private hidden test harness
- Per-user and organization quotas

### Wave 4: full-stack project runtime

Deliver only when a shipped project requires it:

- Persistent named Vercel Sandbox workspace
- Custom or managed image with pinned dependencies
- One preview port and health check
- Public-preview warning and restricted iframe
- Explicit stop plus bounded session timeout
- Supabase remains canonical; keep one short-lived snapshot

The URL Shortener API becomes the first remote project pilot.

### Wave 5: Python-first DSA

Deliver:

- Python default starter signatures and test harness
- Prompt, examples, editor, results, and complexity reflection
- Visible examples in the client
- Hidden tests in a non-persistent evaluator
- `dsa_attempts` evidence table
- Optional TypeScript, Java, C++, and Go adapters
- Explicit user language selection persists

DSA is surfaced by `prep_room`; it is not a primary-nav problem catalog.

### Wave 6: evidence-driven adaptation

Deliver:

- Test-backed milestone completion
- Repeated failure produces a smaller `focus_track` move
- Passed project can graduate `studio`
- DSA category misses choose the next interview drill
- Successful preview/test artifacts enrich dossier proof
- Project completion triggers best-effort path re-diagnosis without blocking
  the save

## 8. Runtime security and cost gates

- Never execute student code in the Next.js process.
- Validate path traversal, symlinks, archive expansion, file count, source size,
  output size, and approved manifests.
- Install pinned trusted dependencies before changing sandbox network policy to
  deny-all.
- Kill the full process group between hidden test cases.
- Preview runs on a separate origin with no samehere cookies or secrets.
- Hidden tests never enter a persistent student workspace.
- Do not keep Vercel Functions open while work queues. Return a run id or stream
  a bounded response.
- Start with one cloud preview and two submissions per user concurrently.
- Use spend controls, per-user budgets, explicit stop, and short timeouts.
- Test latency from Vercel Sandbox's current `iad1` region before promising a
  global live-coding experience.

## 9. Wave 1 agent ownership

Workers may run in parallel only with these non-overlapping files.

### Agent A: manifest and technology visuals

Owns:

- `lib/path/studio/**`
- `components/tech/**`
- `public/tech-icons/**`
- `lib/path/types.ts`

Contract:

- Export `getStudioManifest(projectSlug)`
- Export `StudioManifest` and validation helpers
- Export an accessible `TechIcon` component
- Add a versioned `url-shortener` read-only starter manifest
- Do not edit project page, CSS, migrations, or seeds

### Agent B: workspace persistence

Owns:

- New Supabase migration
- `types/database.types.ts`
- `supabase/tests/rls_test.sql`

Contract:

- Add `project_workspaces` and `project_workspace_files`
- Composite same-owner foreign keys and owner-only RLS
- Bounds on paths and file content
- Owner/cross-user/forgery/anon SQL tests
- Do not edit TypeScript application logic

### Agent C: visual studio shell

Owns:

- `app/(app)/projects/[slug]/page.tsx`
- `components/path/studio/**`
- Studio-specific additions in `app/globals.css`

Contract:

- Consume `getStudioManifest(project.slug)`
- Render toolbar, milestone rail, file selector/code viewer, preview/test regions
- Keep `ProjectChecklist` and `ProjectCompletionPanel` flow intact
- No fake preview
- Responsive desktop and mobile tabs
- No editor/runtime dependency yet

## 10. Verification

Wave 1 must include:

- Manifest validation unit tests
- Full test suite
- Typecheck and lint
- Production build
- Rolled-back RLS verification
- Browser walkthrough of URL Shortener desktop and 390px mobile
- File-switching interaction artifact
- Regression check that checklist completion and dossier write-back still work

