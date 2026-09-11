# Sign up

Create your account lets a visitor open the signup form from marketing CTAs, fill email / username / password (and an invite or referral code), see validation errors, and reach login without creating a throwaway production user.

## Sub-features

- `signup-open` shows the create-account form from each listed entry point.
- `signup-fields` exposes Email, Username, Password, and Referral/Invite code.
- `signup-validate-username` rejects short and reserved usernames with an `alert`.
- `signup-validate-password` rejects a password shorter than 8 characters with an `alert`.
- `signup-oauth-visible` shows Google and GitHub buttons when `invite_only=no`.
- `signup-invite-only` shows the invite hint and `Invite code` when `invite_only=yes`.
- `signup-to-login` follows `Log in` to `/login`.

## How to get to it (user POV)

- Choose `Join free`, `Join`, `Join to get a link`, or `Sign up` on the landing page.
- Open `http://127.0.0.1:4173/signup` directly.
- Choose `Create an account` on the login footer.
- Follow an invite or referral link of the form `/signup?ref=<code>` (the code pre-fills `Referral code` / `Invite code`).
- Hit any signed-out gated route (`/feed`, `/search`, `/messages`, …); middleware sends the browser to `/signup`.

## Driving it with control-samehere

Preconditions:

- samehere is healthy at `http://127.0.0.1:4173`.
- `control-samehere doctor` reports this run's URL.
- You will not submit a unique valid email+username against `env_mode=repo` (that creates a real account).
- Note `invite_only` from doctor before asserting OAuth or the referral label.

- **Open from landing.** Choose header `Join free`. Run `control-samehere browser goto --path /` and `control-samehere browser click --role link --name "Join free" --nth 0`. The heading reads `Create your account` and the URL is `/signup`.
- **Open from gated route.** Request the feed as a logged-out user. Run `control-samehere http get --path /feed --expect-status 307`. `Location` contains `/signup`. Then `control-samehere browser goto --path /feed` and confirm the heading `Create your account`.
- **Read fields.** On `/signup` confirm textboxes `Email`, `Username`, `Password`, and either `Referral code` (`invite_only=no`) or `Invite code` (`invite_only=yes`). The submit button is `Create account`.
- **OAuth visibility.** If `invite_only=no`, buttons `Continue with Google` and `Continue with GitHub` are visible. Do not click them. If `invite_only=yes`, those buttons are absent and the hint `samehere is in private beta — ask a member for their code.` is visible.
- **Short username.** Fill a legal email, username `ab`, and an 8+ character password. Run `control-samehere browser fill --role textbox --name "Email" --value "verify@school.edu"`, `control-samehere browser fill --role textbox --name "Username" --value "ab"`, `control-samehere browser fill --role textbox --name "Password" --value "password1"`, and `control-samehere browser click --role button --name "Create account"`. An `alert` reads `Username must be 3-20 characters: lowercase letters, numbers, or underscores.` The URL stays `/signup`.
- **Reserved username.** Replace the username with `edit` and submit again. Run `control-samehere browser fill --role textbox --name "Username" --value "edit"` and `control-samehere browser click --role button --name "Create account"`. An `alert` reads `That username is reserved.`
- **Short password.** Use username `verifyuser` and password `short`. Run `control-samehere browser fill --role textbox --name "Username" --value "verifyuser"`, `control-samehere browser fill --role textbox --name "Password" --value "short"`, and `control-samehere browser click --role button --name "Create account"`. An `alert` reads `Password must be at least 8 characters.`
- **Scaffolded submit (only when `env_mode=scaffolded`).** Use valid-looking fields (`verifyuser` / 8+ password / unused email) and submit. The page stays on `/signup`. Expect an `alert` such as `Couldn't create your account. Try again in a moment.` — proof that the form ran and did not create a session. If the heading becomes `Check your email`, the scaffolding is not what you think; treat that as a failed isolation and cleanup.
- **Cross-link.** Choose `Log in`. Run `control-samehere browser click --role link --name "Log in" --nth 0`. The URL is `/login` and the heading reads `Log in`.
- **Proof.** Capture the form with a validation `alert` visible. Run `control-samehere browser snapshot --aria --path artifacts/signup/invalid-username.aria.txt` and `control-samehere browser screenshot --path artifacts/signup/invalid-username.png`. Both show `Create your account` and the alert text. Write `artifacts/signup/run.json`.

## Gotchas

- A successful submit against a live project sends a confirmation email and shows `Check your email`. That is a real user. Do not do this in verification.
- HTML5 `required` on Email / Username / Password can block submit before the server `alert` appears. If no alert shows, snapshot the still-focused form — do not invent the message.
- `ref` in the query populates the code field; it does not by itself prove the code is valid.
- Username `edit` is reserved because `/profile/edit` is the editor. Other reserved names include `feed`, `login`, `signup`, `admin`, `profile`, `search`, `saved`.
- OAuth on this page would create an account on first provider login and skip the invite gate. Never start it from a verification run.
