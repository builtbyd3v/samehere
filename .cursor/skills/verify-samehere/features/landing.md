# Landing

The logged-out home page at `/` is the marketing surface: a hero, in-page Product / Community / Pricing sections, a community demo, a pricing band, and CTAs that take a visitor to signup or login.

## Sub-features

- `landing-open` renders the hero with samehere identity and the primary Join CTA.
- `landing-nav-login` opens `/login` from the desktop header.
- `landing-nav-join` opens `/signup` from the desktop header.
- `landing-nav-sections` jumps to `#product`, `#community`, and `#pricing` from `Page sections`.
- `landing-community-tabs` switches the Product areas tabs without leaving `/`.
- `landing-footer` reaches Pricing, Terms, Privacy, and Sign up from the footer.

## How to get to it (user POV)

- Open `http://127.0.0.1:4173/` in a logged-out browser.
- Choose the `samehere home` brand from login, signup, pricing, terms, or privacy.
- Follow a marketing link that points at `/` (no `?code=` query — that is forwarded to `/auth/callback`).

## Driving it with control-samehere

Preconditions:

- samehere is healthy at `http://127.0.0.1:4173`.
- `control-samehere doctor` reports `landing=yes` and this run's URL.
- The browser has no `sb-*-auth-token` cookie (a signed-in visitor is redirected to `/feed`).

- **Open landing.** Load `/`. Run `control-samehere browser goto --path /`. The document title contains `samehere`, a `link` named `samehere home` is visible, and the hero heading includes `people` and `Show what you’re building.`
- **Header login.** Choose `Log in`. Run `control-samehere browser click --role link --name "Log in" --nth 0`. The URL is `http://127.0.0.1:4173/login` and the heading reads `Log in`.
- **Return home.** Choose the brand. Run `control-samehere browser click --role link --name "samehere home" --nth 0`. The URL is `http://127.0.0.1:4173/` and the hero is visible again.
- **Header join.** Choose `Join free` in the header. Run `control-samehere browser click --role link --name "Join free" --nth 0`. The URL is `http://127.0.0.1:4173/signup` and the heading reads `Create your account`.
- **Hero join (second entry).** Return home, then choose the hero `Join free`. Run `control-samehere browser goto --path /` and `control-samehere browser click --role link --name "Join free" --nth 1`. The URL is `/signup` again.
- **Section nav.** Return home. Run `control-samehere browser goto --path /`, then `control-samehere browser click --role link --name "Product"`, `Community`, and `Pricing` in turn. After `Product` a heading `Give your project a story.` is in view. After `Community` a heading `Talk it through.` is in view. After `Pricing` a heading `Share your work. Make your portfolio your own.` is in view. The URL hash is `#product`, `#community`, and `#pricing` respectively.
- **Community tabs.** On `/` (or `#community`) choose `Messages`. Run `control-samehere browser click --role tab --name "Messages"`. The selected tab is `Messages` and the panel text includes `Talk with people on a similar path.` Choose `Portfolio`, then `Feed`, and confirm each selected tab's description: `Keep a shareable project page at your username.` / `Share what you are building, learning, or stuck on.`
- **Footer legal.** From `/` choose `Terms` in the footer. Run `control-samehere browser click --role link --name "Terms"`. The heading reads `Terms of Service`. Choose `samehere home`, then footer `Privacy`. The heading reads `Privacy Policy`.
- **Proof.** Recapture the populated landing. Run `control-samehere browser goto --path /`, `control-samehere browser snapshot --aria --path artifacts/landing/home.aria.txt`, and `control-samehere browser screenshot --path artifacts/landing/home.png`. Both artifacts show the samehere brand and the hero heading. After the join click, also keep `artifacts/landing/signup.png` and `artifacts/landing/signup.aria.txt` so the CTA result is paired with the start state. Write `artifacts/landing/run.json` with feature ID `landing`, the entry point used, the URL, and `run_id`.

## Gotchas

- At viewports below `md`, header `Log in` / `Join free` are not rendered. The helper viewport is 1280×800; do not shrink it and then report those links missing.
- Several `Join free` links exist (header, hero, community invite, pricing, finale). `--nth 0` is the header; `--nth 1` is the hero. Snapshot the URL after the click instead of guessing by visual position.
- `#community` is the "Talk it through." demo (`SocialPreview`), not the later "Bring your classmates…" invite band.
- A signed-in session on `/` 307s to `/feed`. If doctor still says `landing=yes` over HTTP but the browser shows the feed, the Chrome profile kept auth cookies — `cleanup` and relaunch.
- `/?code=...` is not the landing; middleware forwards it to `/auth/callback`.
