# Pricing

Pricing shows the Free and Pro plans — $0 forever versus $4.99/month · $12.99/semester — on both the dedicated `/pricing` page and the landing `#pricing` band, and offers `Join free` plus `View Pro`.

## Sub-features

- `pricing-page` renders `/pricing` with the two plan articles and the public header.
- `pricing-landing` renders the same plan copy on `/#pricing`.
- `pricing-join` takes `Join free` to `/signup`.
- `pricing-pro` follows `View Pro` (logged-out, this 307s to `/signup` because `/pro` is gated).
- `pricing-footer` reaches `/pricing` from the landing footer.

## How to get to it (user POV)

- Open `http://127.0.0.1:4173/pricing`.
- Choose `Pricing` in the landing `Page sections` nav or the footer `Pricing` link.
- Scroll the landing page to the band headed `Share your work. Make your portfolio your own.`

## Driving it with control-samehere

Preconditions:

- samehere is healthy at `http://127.0.0.1:4173`.
- `control-samehere doctor` reports this run's URL.

- **Open the page.** Run `control-samehere browser goto --path /pricing`. The document title contains `Pricing`, a `link` named `samehere home` is visible, the heading reads `Share your work. Make your portfolio your own.`, and two articles include `Share work and find peers` ($0 forever) and `More room to present your work` ($4.99 /month · $12.99/semester).
- **Header join.** On `/pricing` choose `Join free`. Run `control-samehere browser click --role link --name "Join free" --nth 0`. The URL is `/signup`.
- **Footer entry.** Run `control-samehere browser goto --path /` and `control-samehere browser click --role link --name "Pricing"`. Accept either `/pricing` (footer) or `/#pricing` (section nav). If the URL is `/`, the `#pricing` heading above is in view. If you need the dedicated page specifically, run `control-samehere browser click --role link --name "Pricing"` from the footer (`navigation` `Footer`) or `goto --path /pricing`.
- **View Pro, logged out.** On `/pricing` or `/#pricing` choose `View Pro`. Run `control-samehere browser goto --path /pricing` and `control-samehere browser click --role link --name "View Pro"`. `control-samehere http get --path /pro --expect-status 307` has `Location` containing `/signup`. The browser lands on `/signup` (heading `Create your account`), not a billing checkout.
- **Proof.** Capture `/pricing` with both plan names visible. Run `control-samehere browser goto --path /pricing`, `control-samehere browser snapshot --aria --path artifacts/pricing/page.aria.txt`, and `control-samehere browser screenshot --path artifacts/pricing/page.png`. Artifacts show `Pricing` identity (brand + heading) and both plan titles. Write `artifacts/pricing/run.json`.

## Gotchas

- Root layout appends ` · samehere` to the title. The visible `<title>` is `Pricing · samehere`, not `Pricing — samehere · samehere`.
- `View Pro` points at `/pro`. Logged-out visitors never see Stripe checkout; middleware sends them to signup first. Do not treat `/signup` as proof that billing is live.
- `NEXT_PUBLIC_BILLING_ENABLED` only changes `/pro` after a session exists. It is out of scope for this feature unless you have a real login.
- Landing `#pricing` and `/pricing` share copy but not chrome: `/pricing` has `PublicHeader` + `Join free`; the landing band sits under `LandingNav`.
- Two `Pricing` links exist on `/` (section nav and footer). Prefer `goto --path /pricing` when the recipe needs the dedicated page.
