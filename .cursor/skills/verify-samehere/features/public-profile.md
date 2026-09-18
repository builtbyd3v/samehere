# Public profile

A published profile at `/profile/<username>` is reachable while logged out. A missing or unreadable username shows `Profile not found`. Live identity, school, counts, and portfolio sections require a real Supabase project and a username that exists.

## Sub-features

- `profile-missing` shows `Profile not found` for an unknown username.
- `profile-edit-gated` keeps `/profile/edit` off the anonymous public surface (307 to `/signup`).
- `profile-public` (only when `env_mode=repo` and `SAMEHERE_VERIFY_PROFILE_USERNAME` is set) renders that student's public page.
- `profile-share` (same precondition as `profile-public`) shows a `Share` control; after `stub-share`, click Share and `share-last` asserts an absolute `https://…/profile/<username>` URL (never a relative path). Portfolio hard keep; never skip when the live profile ran. Unit-test lock remains `lib/portfolio/share.test.ts` / #41 — this step is the UI proof.
- `profile-brand` still offers a way off the missing-profile page (`Back to feed` / `Search`, which themselves gate to signup when logged out).

## How to get to it (user POV)

- Open `http://127.0.0.1:4173/profile/<username>` from a share link or by typing the URL.
- From a signed-in session, choose `Profile` in the left nav (out of scope here — needs a session).
- `/profile/edit` is the editor, not a public username.

## Driving it with control-samehere

Preconditions:

- samehere is healthy at `http://127.0.0.1:4173`.
- `control-samehere doctor` reports this run's URL.
- For `profile-public` only: `env_mode=repo` and `SAMEHERE_VERIFY_PROFILE_USERNAME` is a username that `get_public_profile` returns. Otherwise skip `profile-public` and record it unreachable.

- **Missing profile.** Open a username that does not exist. Run `control-samehere browser goto --path /profile/verify_no_such_user`. The page text includes `Profile not found` and `This student doesn’t exist, or the link is broken.` Links `Back to feed` and `Search` are visible.
- **Missing-profile exits, logged out.** Choose `Back to feed`. Run `control-samehere browser click --role link --name "Back to feed"`. The browser ends on `/signup` (heading `Create your account`), not `/feed`. Confirm with `control-samehere http get --path /feed --expect-status 307`. Repeat from the missing profile with `Search` if you need that entry; it also gates.
- **Edit is not public.** Run `control-samehere http get --path /profile/edit --expect-status 307`. `Location` contains `/signup`.
- **Published profile (optional).** If the precondition is met, run `control-samehere browser goto --path /profile/$SAMEHERE_VERIFY_PROFILE_USERNAME`. The page does **not** say `Profile not found`. The username or display name is visible, and a `samehere home` or in-app identity is present. Private accounts may hide posts and still show identity and counts — that is a valid published state. If the page 404s, the username is wrong or the RPC failed; report unreachable, do not substitute another user.
- **Share absolute URL (optional, same precondition).** Install the share recorder, open the live profile, click Share, then assert the captured URL. Run `control-samehere browser stub-share`, then `control-samehere browser goto --path /profile/$SAMEHERE_VERIFY_PROFILE_USERNAME`, then `control-samehere browser click --role button --name "Share"`, then `control-samehere browser share-last --expect-https --username "$SAMEHERE_VERIFY_PROFILE_USERNAME" --path artifacts/public-profile/share-last.json`. `share-last` must print `url=` starting with `https://` and containing `/profile/<username>` (via `share` or `clipboard`). A relative path or preview host fails the step. Skip only when `profile-public` was unreachable.
- **Proof.** Capture the missing-profile state (always in scope). Run `control-samehere browser goto --path /profile/verify_no_such_user`, `control-samehere browser snapshot --aria --path artifacts/public-profile/missing.aria.txt`, and `control-samehere browser screenshot --path artifacts/public-profile/missing.png`. Both show `Profile not found`. If `profile-public` ran, also write `artifacts/public-profile/published.png` and `published.aria.txt` for that username. If `profile-share` ran, keep `artifacts/public-profile/share-last.json`. Write `artifacts/public-profile/run.json` listing which sub-features ran.

## Gotchas

- `env_mode=scaffolded` makes every username look missing because the public RPC cannot run. That still proves `profile-missing`. It does not prove `profile-public`.
- `/profile/edit` matches the editor route, not username `edit`. Anon visitors never see a "Profile not found" for `edit`; they are redirected to signup.
- Do not use the anon key to enumerate profiles. Only open a username you were given (`SAMEHERE_VERIFY_PROFILE_USERNAME`) or the fixed missing fixture `verify_no_such_user`.
- `Back to feed` / `Search` on the not-found card are signed-in destinations. Logged-out proof is the redirect to signup, not a feed timeline.
- `stub-share` must run before the profile `goto` (or reload after stubbing) so the page sees the recorder. The Share URL is never an href in the DOM — do not try to read it from an ARIA snapshot.
- `share-last` is a UI proof path only. The absolute-URL contract lock for merges is still `lib/portfolio/share.test.ts` (and #41). Do not treat a green skill run as a substitute for those tests.
- Public posts at `/post/<id>` are a different surface (not this feature). A single post can 404 independently of the profile.
