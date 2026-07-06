<wizard-report>
# PostHog post-wizard report

The wizard completed a targeted PostHog integration for this Next.js App Router app. It installed the PostHog client and server SDKs, initialized browser-side PostHog through `instrumentation-client.ts`, added a server helper for short-lived server-side event delivery, wired a Next.js ingest proxy in `next.config.ts`, and added authenticated user identification in the signed-in app layout. It also added client-side error capture for the app error boundary, configured the required Next.js public environment variables locally, and instrumented key business events across posting, messaging, feedback, referrals, Pro intent, billing portal access, logout, and Stripe checkout completion. A PostHog dashboard plus five saved insights were created to give immediate visibility into acquisition, activation, sharing, messaging, and monetization behavior.

| Event name | Description | File |
| --- | --- | --- |
| user_signed_up | Captured when a student account signup succeeds on the server. | app/(auth)/actions.ts |
| user_logged_in | Captured when a login succeeds and a session is created. | app/(auth)/actions.ts |
| user_logged_out | Captured when a signed-in user logs out from the navigation menu. | components/layout/NavMenu.tsx |
| post_created | Captured when a user successfully publishes a post. | app/(app)/feed/actions.ts |
| message_sent | Captured when a direct message is successfully inserted. | app/(app)/messages/actions.ts |
| feedback_submitted | Captured when a signed-in user submits feedback from the modal. | components/feedback/FeedbackButton.tsx |
| pro_waitlist_joined | Captured when a user joins the Pro waitlist. | app/(app)/pro/actions.ts |
| billing_portal_opened | Captured when a Pro user opens the Stripe billing portal. | app/(app)/pro/actions.ts |
| stripe_checkout_completed | Captured when the Stripe webhook confirms checkout completion. | app/api/stripe/webhook/route.ts |
| referral_link_copied | Captured when a user copies their referral signup link. | components/referrals/ReferralShareCard.tsx |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- Dashboard: https://us.posthog.com/project/500701/dashboard/1807281
- Insight: Signups over time (wizard) — https://us.posthog.com/project/500701/insights/v8RHwYab
- Insight: Posts created over time (wizard) — https://us.posthog.com/project/500701/insights/LXoqK0VB
- Insight: Messages sent over time (wizard) — https://us.posthog.com/project/500701/insights/ObqtL23X
- Insight: Referral link copies over time (wizard) — https://us.posthog.com/project/500701/insights/2vqPTKvI
- Insight: Pro conversion funnel (wizard) — https://us.posthog.com/project/500701/insights/jjKbl1sY

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add the exact PostHog env var names you added to `.env.example` and any monorepo/bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — a handler that only identifies on fresh login can leave returning sessions on anonymous distinct IDs.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
