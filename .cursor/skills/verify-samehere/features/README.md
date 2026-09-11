# samehere verification map

This directory is the maintained source for verifying the user-facing behavior of samehere. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch samehere at `http://127.0.0.1:4173` with `control-samehere launch`.
- Run `control-samehere doctor` and require `url=http://127.0.0.1:4173`, a live pid that owns that port, and `landing=yes`.
- Drive at a 1280×800 desktop viewport (the helper sets this). Mobile widths hide `Log in` / `Join free`.
- Never drive an instance that was not started by this verification run.
- If `env_mode=scaffolded`, do not report live signup, live login, or a published public profile as verified. Form chrome, validation alerts, marketing pages, and `Profile not found` remain in scope.
- If `invite_only=yes`, signup requires `Invite code` and OAuth buttons are hidden on login and signup.
- Do not click `Continue with Google` or `Continue with GitHub`.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names over CSS selectors or DOM position.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Run browser actions through `control-samehere browser`.
- Run redirect checks through `control-samehere http get`.
- Restore the browser to `/` after a mutation-like navigation if the next recipe needs the landing. Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with the samehere brand visible.
- Redirect proof includes status and `Location`.
- Record the feature ID and entry point used with every artifact (`artifacts/<id>/run.json`).
- Report an unreachable path with the attempted command and the unmet precondition (`env_mode=scaffolded`, missing `SAMEHERE_VERIFY_PROFILE_USERNAME`, no session).
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with control-samehere` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Landing](./landing.md) covers the logged-out home page: hero, section nav, community tabs, pricing band, and CTAs into signup/login.
- [Sign up](./signup.md) covers the create-account form, validation, footer cross-link, and the invite-only variant.
- [Log in](./login.md) covers the login form, forgot-password, and the anonymous redirect into auth.
- [Pricing](./pricing.md) covers `/pricing` and the landing `#pricing` band, including the Pro link.
- [Public profile](./public-profile.md) covers a missing username and, when a live project is configured, a published `/profile/<username>` page.
