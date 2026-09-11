# Verification evidence

Proof artifacts for a verify-samehere run live here, one subdirectory per feature ID (`landing/`, `signup/`, `login/`, `pricing/`, `public-profile/`).

Cleanup tears down the Next.js process, the Chrome session, and `/tmp` scratch state. It never deletes this directory.

Typical files for a UI proof:

- `01-home.png` / `01-home.aria.txt` — starting surface
- `02-<action>.png` / `02-<action>.aria.txt` — the user action's resulting state
- `run.json` — feature ID, entry point, URL, run ID, doctor excerpt

Name files so the action and the result stay paired. Do not overwrite another run's files; use a fresh subdirectory or a timestamped prefix if you need to keep both.
