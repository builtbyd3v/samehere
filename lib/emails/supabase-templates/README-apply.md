# Supabase auth email templates — apply notes

Reference copies only. Supabase dashboard (Authentication > Email Templates) holds the live values — paste the HTML body of each file into the matching dashboard screen, then set the subject.

- `confirm-signup.html` -> dashboard screen "Confirm signup" | subject: `confirm your samehere email`
- `reset-password.html` -> dashboard screen "Reset password" | subject: `reset your samehere password`

No "Change email address" template: no email-change flow exists in the app (grep for `updateUser({ email` found nothing) — not authored.
No magic link / OTP template: `signInWithOtp` not used anywhere in the app — not authored.

After pasting into the dashboard, smoke test both flows in prod (signup + forgot password) before considering this live.
