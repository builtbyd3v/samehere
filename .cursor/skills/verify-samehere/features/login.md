# Log in

Log in lets a returning visitor open the email/password form, reach forgot-password, and see a failed-sign-in alert without leaking whether an email exists. A signed-out visitor who hits a gated route is sent to signup, not login.

## Sub-features

- `login-open` shows the login form from the landing header and from signup.
- `login-fields` exposes Email, Password, `Log in`, and `Forgot password?`.
- `login-reject` shows `Invalid email or password.` (or a confirm-email alert) after a failed submit.
- `login-forgot` opens `/forgot-password` and accepts an email without revealing whether the account exists.
- `login-to-signup` follows `Create an account`.
- `login-oauth-visible` shows Google and GitHub when `invite_only=no`.

## How to get to it (user POV)

- Choose `Log in` in the landing header (desktop) or the landing mobile menu.
- Choose `Log in` on the signup footer.
- Open `http://127.0.0.1:4173/login` directly.
- Choose `Forgot password?` on the login form to reach `/forgot-password`.
- After a successful login the app navigates to `/feed` (not in scope without a real session).

## Driving it with control-samehere

Preconditions:

- samehere is healthy at `http://127.0.0.1:4173`.
- `control-samehere doctor` reports this run's URL.
- You do not have (and will not use) a real password for a production user.

- **Open from landing.** Choose header `Log in`. Run `control-samehere browser goto --path /` and `control-samehere browser click --role link --name "Log in" --nth 0`. The URL is `/login`, the heading reads `Log in`, and the aside heading `Welcome back.` is visible.
- **Open from signup.** Run `control-samehere browser goto --path /signup` and `control-samehere browser click --role link --name "Log in" --nth 0`. Same `/login` heading.
- **Read fields.** Textboxes `Email` and `Password`, button `Log in`, link `Forgot password?`. If `invite_only=no`, buttons `Continue with Google` and `Continue with GitHub` are visible — do not click them.
- **Failed password.** Fill a well-formed email and a password and submit. Run `control-samehere browser fill --role textbox --name "Email" --value "verify@school.edu"`, `control-samehere browser fill --role textbox --name "Password" --value "wrong-password"`, and `control-samehere browser click --role button --name "Log in"`. An `alert` reads `Invalid email or password.` The URL stays `/login`. (A confirmed-but-unverified account would instead read `Confirm your email first, check your inbox for the link.` — still a failure, still on `/login`.)
- **Empty submit.** Reload `/login` and choose `Log in` with empty fields. HTML5 validation may prevent navigation. The URL stays `/login` and there is no session cookie. Do not require an `alert` unless one appears (`Enter your email and password.`).
- **Forgot password.** Choose `Forgot password?`. Run `control-samehere browser click --role link --name "Forgot password?"`. The heading reads `Reset your password` and the URL is `/forgot-password`. Fill `School email` with `verify@school.edu` and choose `Send reset link`. Run `control-samehere browser fill --role textbox --name "School email" --value "verify@school.edu"` and `control-samehere browser click --role button --name "Send reset link"`. The heading becomes `Check your email` and a status reads `If an account exists for that email, we sent a link to reset your password.`
- **Cross-link.** From `/login` choose `Create an account`. Run `control-samehere browser goto --path /login` and `control-samehere browser click --role link --name "Create an account"`. The URL is `/signup`.
- **Gated route is signup, not login.** Run `control-samehere http get --path /messages --expect-status 307`. `Location` contains `/signup`, not `/login`.
- **Proof.** Capture `/login` with the invalid-password `alert`. Run `control-samehere browser snapshot --aria --path artifacts/login/invalid.aria.txt` and `control-samehere browser screenshot --path artifacts/login/invalid.png`. Both show heading `Log in` and the alert. Write `artifacts/login/run.json`.

## Gotchas

- Failed login copy is deliberately vague. `Invalid email or password.` does not prove the email is unknown.
- `Forgot password` always claims a link was sent. That page is not proof a message left the machine — check only the user-visible success copy. Against `env_mode=scaffolded` the network call to Supabase fails silently and the same copy still appears.
- A real success redirects to `/feed`. If that happens during verification, stop and cleanup; you used a live credential.
- `invite_only=yes` hides OAuth on this page for the same reason as signup (first OAuth login would create an account).
- Header `Log in` is desktop-only. Use `--nth 0` after `goto /` at 1280×800.
