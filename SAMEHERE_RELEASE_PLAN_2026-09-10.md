# Samehere release plan

Approved September 10, 2026, including optional post labels and open-to profile tags. This plan consolidates the conversation and updates [the September 9 investigation](SAMEHERE_REDESIGN_2026-09-09.md). See [the implementation spec](SAMEHERE_IMPLEMENTATION_SPEC.md) for contracts, defaults, and acceptance criteria.

**Product:** A social network for CS/SWE students to share what they are building, learning, and struggling with, discover peers, and showcase their work. The feed, DMs, and shareable portfolios are the core experiences.

**Agreed release scope**

- Preserve the feed, posts, comments, SameHere reactions, following, reposts, DMs, notifications, and essential privacy, reporting, blocking, and account controls. Login lands in the feed; profile setup is optional.
- Expand profiles into externally readable portfolios: introduction, links, projects, activity, experience/education, and recent posts subject to their existing visibility rules. Owners explicitly publish newly public sections. Retain `/profile/[username]`, add sharing and a logged-out preview, and keep search indexing an explicit choice.
- Connect GitHub and display cached GitHub contributions alongside Samehere activity in one calendar, with source filters and labeled daily breakdowns. Keep source metrics distinct. Public profile visits do not trigger synchronization or AI analysis.
- Ship one AI workflow: select a public GitHub repository, analyze its documentation and relevant code, preview an editable portfolio project, confirm the student's role, and publish. Manual project creation remains available. Offer an optional feed announcement after publishing.
- Give analysis a polished animation using the redesign's typography, dark surfaces, file-tree movement, and emerging project preview. Show actual processing stages and clear retry/failure states; respect reduced motion. Save analysis results and rerun only on request. Drafts remain private until published; claims must be supported by repository evidence or confirmed by the student. Repository analysis reads code without executing it.
- Use ordinary text search, filters, and relevance ranking for people, projects, and discussions. Search follows the viewer's access permissions. It makes no paid AI calls.
- Keep Pro and existing subscriber entitlements. Proposed updated benefits: portfolio customization, aggregate visit/project-click analytics, and higher repository-analysis allowances. Core social participation, a useful portfolio, sharing, and GitHub activity stay free. Final prices, quotas, and any entitlement transition belong in the spec after an analysis-cost check.
- Keep referrals, attribution, earned rewards, and progress. Refresh the invite experience and presentation to fit the redesign. Any reward-rule change must be explicit and preserve already-earned benefits.
- Remove clubs and Eve, including related scheduled work. Disable jobs and job-related background processing while retaining data for a future student-focused approach. Retire the replaced AI matching/writing surfaces. Global leaderboard removal remains the proposed default from the earlier plan.

**Design source**

Port the existing x.ai-style landing from `/mnt/d/Workspace/samehere/.claude/worktrees/zero-to-internship`, including its relevant components, styles, motion, and assets. Adapt copy and demonstrations to the feed, DMs, portfolios, and GitHub analysis. Extend that visual system to the internal app with restrained interaction motion. Review the source diff and port the landing deliberately so the older internship-coach product logic is not brought into this release.

**Approved additions for the “same here” identity**

1. Optional post labels: **Building / Learning / Stuck**. Make it easy to share unfinished work and ask for help within the existing feed.
2. Optional profile tags: **Open to collaborate / Study together / Feedback**. Expose these as normal search filters and entry points to a DM.
3. Later: a linked follow-up from an earlier struggle to a progress update. Defer this to keep the first release small.

LeetCode/NeetCode sync, private-repository analysis, custom domains, and a replacement jobs experience are deferred.

**Execution and review**

1. Implement the approved social additions and the Pro boundaries in the implementation spec, using its shared contracts and acceptance checks.
2. Use the user's clarified worker configuration: **Cursor (`acp-cursor`), Grok 4.6, xhigh, fast**. The working checkout and both initial workers' recorded execution settings have been verified.
3. The primary assistant is the sole planner, orchestrator, and reviewer. Grok workflow workers perform all application implementation, integration edits, and fixes. Give workers explicit file ownership and review shared foundations before dependent work.
4. Deliver shared styling and scope cleanup, then portfolios/GitHub, AI analysis, the adapted landing, and Pro/referral updates. Parallelize independent work after shared contracts are established.
5. Verify the complete flow: connect/select repository → analysis and failure recovery → edit draft → publish → view logged-out portfolio → optionally post → react/comment/DM. Check visibility boundaries, billing/AI limits, referral preservation, mobile layout, reduced motion, and retired background work. The primary assistant reviews evidence and returns corrections to workers.

The baseline dev server is running and verified. Application implementation follows the spec and worker preflight.
