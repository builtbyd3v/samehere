---
kind: spec
title: "Samehere: keep the feed, make profiles shareable portfolios"
---

## Settled product direction

The user's September 9, 2026 direction is a social network for CS/SWE students. Login should lead immediately to the existing kind of feed. Profiles become prominent, externally shareable portfolio pages containing projects, background, and one contribution calendar with source breakdowns. The user is willing to remove substantial peripheral scope and unnecessary AI integrations. Exact feature deletions have not been approved.

This direction replaces the earlier proposed solo application workspace and adaptive internship coach as the working product direction. The application-workspace artifact remains historical. This is an investigation and scope recommendation, not an implementation ticket. No application code or live settings changed.

## Integration findings, checked September 9, 2026

| Source | What is verified | Release recommendation |
|---|---|---|
| GitHub | Official GraphQL schema exposes daily dates, contribution counts, levels, weeks, and yearly ranges through User.contributionsCollection.contributionCalendar. | Build first. Officially documented integration, pending an authenticated end-to-end test. |
| Samehere | Existing heatmap, daily scoring, and breakdown UI are present in this checkout. | Reuse the calendar presentation; distinguish existing weighted points from event counts. |
| LeetCode | An inspected community implementation queries matchedUser.submissionCalendar using LeetCode GraphQL. No official supported activity integration contract was located. Published terms explicitly restrict scraping and unattended processes. | Technically plausible unofficial integration, but do not promise or depend on automatic sync without clarifying authorization with LeetCode. |
| NeetCode | Its current roadmap visibly includes a calendar plus current/best streak. No documented third-party activity API or dated export was found in the public site and searches. | Automatic integration remains unverified. Defer; support user-supplied links or explicitly self-reported practice if desired. |

Verification boundary: inspected official documentation, live public pages, and the source of one unofficial LeetCode implementation. No authenticated API calls, private-account reads, CAPTCHA bypass, or production sync tests were performed. Absence of located documentation is not proof that no private partner API exists.

### GitHub details

Use user(login) -> contributionsCollection(from, to) -> contributionCalendar -> weeks -> contributionDays with date and contributionCount. The returned calendar also supplies contributionLevel. Contributions include more than commits; label them GitHub contributions.

GitHub's schema documents read:user requirements around private/internal contributions and separately documents restricted counts when the user chooses to share them. Start with public activity. Treat private aggregate counts as optional, explicitly consented, and test them separately; do not expose repository names or private work details in a public portfolio.

The GraphQL API requires authentication and supports personal access tokens, GitHub Apps, and OAuth apps. Recommend an explicit connect-account flow that verifies the user's GitHub identity. Existing GitHub login is a useful starting point but does not by itself establish durable background-sync credentials. Do not ask users to paste personal tokens into the product.

Fetch on connect, cache a rolling year, then refresh on a bounded schedule rather than on every public-profile request. Preserve the last successful result and display its sync age when a refresh fails. Public portfolios should still load when GitHub is unavailable. Disconnect should stop synchronization and remove the public display of imported activity.

Sources: [GitHub user and contribution schema](https://docs.github.com/en/graphql/reference/users), [GitHub GraphQL authentication](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql).

### LeetCode details

The inspected community code posts to https://leetcode.com/graphql and requests submissionCalendar, accepted submission totals, and recent submissions separately. It parses calendar JSON into timestamp-keyed counts. This demonstrates a known implementation approach, not that the endpoint is supported for Samehere or that it currently works for every user.

A submission calendar must not be relabeled as distinct problems solved or an accepted-solution streak without validating its exact semantics. Counts alone do not identify unique problems, and a recent-submission list is not proof of complete historical coverage.

The currently published Terms restrict crawling/scraping and processes operating while the user is not logged in. Product recommendation: obtain clarification/permission for the intended sync before committing to this dependency. A proxy API or browser extension does not by itself establish permission or stability. This is not a legal determination about a specific implementation.

Sources: [Community implementation source](https://github.com/faisal-shohag/leetcode_api/blob/master/leetcode.js), [LeetCode Terms](https://leetcode.com/terms/).

### NeetCode details

The current roadmap shows a monthly calendar and current/best streak with a one-problem-per-day explanation. NeetCode does have activity UI; the uncertainty is access for another product. Its terms discuss public identity but do not provide a public activity integration contract. Do not infer that public usernames imply publicly readable dated progress.

No documented API, OAuth data-sharing flow, or dated progress export was located. Do not reconstruct old streaks from completion checkboxes or totals. A future export would only support historical heatmaps if it includes trustworthy dates. Official support is listed on the site if partner access is pursued; no message was sent.

Sources: [NeetCode roadmap](https://neetcode.io/roadmap), [NeetCode terms](https://neetcode.io/terms), [NeetCode contact and product site](https://neetcode.io/).

## One calendar without misleading totals

Keep source and metric with each day's value. The existing Samehere points must not be blindly summed with GitHub contributions or future practice submissions and called work completed.

Recommended display: one calendar with All / GitHub / Samehere / Practice filters and a day breakdown. Use an activity-presence or capped visual intensity rule for All; do not add a global productivity score. Clearly label imported versus self-reported values. Source-specific streaks remain separate; a Samehere post never extends a LeetCode streak.

Preserve provider-defined calendar dates for date-only imports. Samehere currently uses America/New_York day boundaries. Explain that source calendars may use different boundaries; do not claim an exact universal streak when the original event timestamps are unavailable. A sync failure means unknown/stale, not zero. If one practice activity appears in two services later, do not claim summed counts represent unique problems.

Automatic imports populate profiles, not automatic feed posts. Let the user choose to share a milestone so the existing feed remains human-authored.

## Existing code and gaps

| Area | Current source | Implication |
|---|---|---|
| Login | app/(auth)/actions.ts redirects to /feed. OAuth callback defaults to /feed but sends new accounts to /onboarding. | Preserve returning-user behavior. To satisfy immediate feed access for first-time users too, move profile setup into an optional feed prompt. |
| Public profile | app/(app)/profile/[username]/page.tsx has a separate PublicProfileView using bounded public RPCs. | Expand this view deliberately; the logged-out page currently omits the experience/education sections and gates posts behind login. |
| Signed-in profile | Same page already renders education and experience. | Reuse existing editors; add featured projects, outbound links, and portfolio layout. |
| Activity | components/profile/ContributionHeatmap.tsx uses daily points and action breakdowns. | Reuse grid rendering, revise metric/source handling. |
| Sharing | Profile OG and Twitter image routes already exist, plus a canonical origin in lib/site.ts. | Add a prominent Share portfolio action and copy-link fallback; upgrade previews to match published portfolio content. |
| Discovery | Profile metadata currently sets index:false and follow:false. | Direct sharing works independently of search indexing. Search discoverability should be an explicit owner choice, not silently enabled for existing profiles. |

## Proposed smaller product boundary

Keep the current feed format and its core social interactions: posts, comments, SameHere reactions, following, and existing repost behavior. Promote Profile near the top of navigation and make author names/avatars clear entry points to portfolios. Keep notifications and essential reporting, blocking, privacy, and account controls. Messaging scope can be decided separately; the user has not approved its removal.

Proposed removals: jobs and job AI, clubs/Eve, AI people matching and search, connection explanations, AI post/bio/DM generation, weekly match emails, global leaderboards, referral gamification, and cosmetic Pro upsells. Each is a proposal; existing subscriptions and user data need transition handling before live retirement. Removing UI alone does not disable associated scheduled jobs or costs.

Suggested portfolio order: introduction and links, featured projects, combined activity, experience/education, then recent posts. Show useful work ahead of follower counts. Offer a logged-out portfolio preview in the editor so users can verify what a recipient will actually see.

Keep the existing /profile/[username] URL for the first release. A short alias or custom domain is unnecessary to validate sharing. External viewers should be able to read all explicitly published portfolio sections and open project/demo links without signing up. Signup remains necessary for social participation. Preserve privacy gates and make any newly public sections opt-in; do not expose previously signed-in-only details by migration default.

## Recommended release sequence

1. Complete externally readable portfolio sections, featured projects, and a clear share button while preserving feed landing.
2. Add verified GitHub linking, cached daily contributions, and source-aware heatmap display alongside Samehere activity.
3. Retire an agreed set of AI and peripheral features, including their scheduled work; update landing copy to describe the shipped feed-plus-portfolio product.
4. Revisit LeetCode only with a supported/authorized route, and NeetCode when dated progress access is demonstrated. Neither integration should block portfolio launch.

The individual value is a portfolio a student can share immediately. The network value is discussion and discovery through the existing feed. Public profile visits and actual shares can test the distribution hypothesis; they do not guarantee network growth.
