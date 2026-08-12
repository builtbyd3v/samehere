import type { CompanyInterviewBank } from "@/lib/path/types";

/** Starter banks — company_slug aligns with common job_companies-style slugs. */
export const COMPANY_INTERVIEW_BANKS: CompanyInterviewBank[] = [
  {
    company_slug: "Google",
    company_name: "Google",
    process_summary:
      "Typical internship loop: online assessment (DSA), 1–2 technical interviews (coding + follow-ups), and a lighter Googleyness / role conversation. Expect clarity on complexity and edge cases more than framework trivia.",
    questions: [
      {
        id: "google-coding-1",
        type: "coding",
        difficulty: "intermediate",
        prompt:
          "Given a list of meeting time intervals, return the minimum number of meeting rooms required. Walk through an example and state time/space complexity.",
        approach:
          "Sort starts and ends separately (or use a min-heap of end times). Sweep chronologically: a new room when a meeting starts before the earliest end frees. Narrate invariants as you code.",
        evaluating:
          "Correct interval handling, clean complexity analysis, and whether you test overlapping / nested / back-to-back cases without prompting.",
      },
      {
        id: "google-sd-1",
        type: "system_design",
        difficulty: "intermediate",
        prompt: "Design a URL shortener that supports 100M redirects/day. What do you store, how do you generate codes, and where do you cache?",
        approach:
          "Clarify write vs read ratio, code space, and analytics needs. Cover unique code generation, DB schema, cache for hot redirects, and 404/expiry. Tie to a project you’ve shipped if you have one.",
        evaluating:
          "Ability to scope, pick practical storage, reason about collisions, and call out monitoring — not inventing unnecessary microservices.",
      },
      {
        id: "google-behavioral-1",
        type: "behavioral",
        difficulty: "beginner",
        prompt: "Tell me about a time you got stuck on a bug longer than a day. What did you try, and what changed your approach?",
        approach:
          "Use STAR. Emphasize hypothesis-driven debugging, asking for help at the right time, and what you systematized afterward (repro, logging, bisect).",
        evaluating:
          "Ownership, learning speed, and humility — not a heroic solo narrative that ignores teammates.",
      },
    ],
  },
  {
    company_slug: "Meta",
    company_name: "Meta",
    process_summary:
      "Often coding-heavy: OA or recruiter screen, then 2–3 interviews mixing algorithms with product sense / behavioral. Expect follow-ups that push for cleaner abstractions and tradeoff talk.",
    questions: [
      {
        id: "meta-coding-1",
        type: "coding",
        difficulty: "intermediate",
        prompt:
          "Implement a function that returns the k most frequent elements in an array. Discuss heap vs bucket-count approaches.",
        approach:
          "Count frequencies, then either heap select top-k or bucket by frequency. State when n is small vs when k≈n. Write tests for ties if time allows.",
        evaluating:
          "Data structure choice, complexity, and whether you communicate before diving into code.",
      },
      {
        id: "meta-role-1",
        type: "role_fit",
        difficulty: "beginner",
        prompt: "Why Meta for an internship, and what product surface would you want to improve first?",
        approach:
          "Be specific: a product you use, a measurable friction, and how your skills map. Avoid generic “scale” praise.",
        evaluating:
          "Genuine product curiosity and whether you can connect personal projects to Meta’s problem space.",
      },
      {
        id: "meta-behavioral-1",
        type: "behavioral",
        difficulty: "intermediate",
        prompt: "Describe a disagreement with a teammate about implementation. How did you resolve it?",
        approach:
          "Show data or user impact as the tie-breaker. Own your communication mistakes. End with the shared outcome.",
        evaluating:
          "Collaboration under conflict — Meta interviews listen for ego vs team outcomes.",
      },
    ],
  },
  {
    company_slug: "Amazon",
    company_name: "Amazon",
    process_summary:
      "Leadership Principles are first-class. Expect OA coding, then interviews pairing DSA with LP stories (Ownership, Dive Deep, Customer Obsession). Prepare concrete examples with metrics.",
    questions: [
      {
        id: "amazon-coding-1",
        type: "coding",
        difficulty: "intermediate",
        prompt:
          "Design a data structure that supports insert, delete, and getRandom in average O(1). Outline the structures you combine.",
        approach:
          "Array for random index + hash map from value→index. Detail swap-delete to keep the array dense. Handle duplicates if asked.",
        evaluating:
          "Correct structure combo, edge cases on delete, and clear complexity claims.",
      },
      {
        id: "amazon-behavioral-1",
        type: "behavioral",
        difficulty: "intermediate",
        prompt: "Tell me about a time you owned a problem end-to-end when it wasn’t clearly your job (Ownership).",
        approach:
          "STAR with a measurable customer or teammate outcome. Show initiative without ignoring stakeholders. Map explicitly to Ownership.",
        evaluating:
          "Bias for action, follow-through, and whether you escalate appropriately.",
      },
      {
        id: "amazon-role-1",
        type: "role_fit",
        difficulty: "beginner",
        prompt: "Which Amazon Leadership Principle do you demonstrate most strongly, and what’s the evidence?",
        approach:
          "Pick one principle, give one sharp story, and one “still growing” principle with a plan. Avoid listing all 16.",
        evaluating:
          "Self-awareness and evidence quality — not slogan fluency.",
      },
    ],
  },
  {
    company_slug: "Microsoft",
    company_name: "Microsoft",
    process_summary:
      "Mix of coding, design-lite, and collaborative behavioral. Teams vary widely (Azure, Office, LinkedIn, gaming). Expect readable code and questions about working across groups.",
    questions: [
      {
        id: "msft-coding-1",
        type: "coding",
        difficulty: "beginner",
        prompt:
          "Given a binary tree, return its level-order traversal. How would you adapt this for zigzag order?",
        approach:
          "BFS with a queue; track level size. For zigzag, reverse every other level or use a deque. Discuss iterative vs recursive.",
        evaluating:
          "Fundamentals, code clarity, and how you extend the solution when requirements change.",
      },
      {
        id: "msft-sd-1",
        type: "system_design",
        difficulty: "beginner",
        prompt: "Design a notification system for a collaborative doc editor (mention alerts, email digest).",
        approach:
          "Separate realtime vs async paths, fanout strategies, user prefs, and dedupe. Keep intern-scope: one channel deep beats five shallow.",
        evaluating:
          "Prioritization, API boundaries, and awareness of spam/preferences.",
      },
      {
        id: "msft-behavioral-1",
        type: "behavioral",
        difficulty: "beginner",
        prompt: "Tell me about a time you had to learn a new tool or codebase quickly to unblock a deadline.",
        approach:
          "Show how you scoped learning: docs, debugger, smallest repro, asking targeted questions. End with what shipped.",
        evaluating:
          "Growth mindset and practical learning tactics under time pressure.",
      },
    ],
  },
  {
    company_slug: "Apple",
    company_name: "Apple",
    process_summary:
      "Team-dependent; often coding + deep dive into a past project, with strong emphasis on craft, privacy, and user experience detail. Bring polished project narratives.",
    questions: [
      {
        id: "apple-coding-1",
        type: "coding",
        difficulty: "intermediate",
        prompt:
          "Implement an LRU cache with get/put in O(1). Explain why your structure choices guarantee the bounds.",
        approach:
          "Hash map + doubly linked list (or language OrderedDict equivalent). Narrate move-to-front and eviction. Watch capacity 0/1.",
        evaluating:
          "Precise complexity, pointer/list hygiene, and testing of eviction order.",
      },
      {
        id: "apple-role-1",
        type: "role_fit",
        difficulty: "intermediate",
        prompt: "Walk through a project where you obsessed over a small UX or performance detail. What measured better afterward?",
        approach:
          "Pick one detail (loading state, error copy, cold start). Show before/after and the constraint you respected (battery, privacy, accessibility).",
        evaluating:
          "Taste, measurement, and whether you care about the person using the product.",
      },
      {
        id: "apple-behavioral-1",
        type: "behavioral",
        difficulty: "beginner",
        prompt: "Describe feedback you received that was hard to hear. What did you change?",
        approach:
          "Own the gap without defensiveness. Show the behavioral change and a later proof point.",
        evaluating:
          "Coachability — critical for Apple’s apprenticeship-style internships.",
      },
    ],
  },
  {
    company_slug: "Stripe",
    company_name: "Stripe",
    process_summary:
      "Known for practical coding, API design taste, and debugging realism. Expect careful edge-case talk (money, idempotency, retries) and clear written/verbal communication.",
    questions: [
      {
        id: "stripe-coding-1",
        type: "coding",
        difficulty: "intermediate",
        prompt:
          "You’re building a transfer API. How would you make POST /transfers idempotent when clients retry with the same Idempotency-Key?",
        approach:
          "Store key → response mapping with request hash. Replay identical requests; reject payload mismatches. Discuss TTL and concurrency.",
        evaluating:
          "Real-world API instincts: retries, exactly-once effects, and failure modes.",
      },
      {
        id: "stripe-sd-1",
        type: "system_design",
        difficulty: "intermediate",
        prompt: "Design an expense splitter’s balance ledger. When do you store balances vs recompute from events?",
        approach:
          "Event-sourced expenses as source of truth; optional materialized balances with rebuild path. Cover currency/rounding briefly.",
        evaluating:
          "Data modeling judgment and honesty about consistency vs complexity.",
      },
      {
        id: "stripe-behavioral-1",
        type: "behavioral",
        difficulty: "beginner",
        prompt: "Tell me about a time you wrote an API or library interface that other people had to use. What did you learn?",
        approach:
          "Focus on naming, errors, versioning, and docs. Show how user feedback changed the interface.",
        evaluating:
          "Empathy for integrators — core Stripe DNA.",
      },
    ],
  },
  {
    company_slug: "NVIDIA",
    company_name: "NVIDIA",
    process_summary:
      "Role-dependent: software roles still see DSA, plus questions that probe systems performance, parallelism intuition, or domain fit (CUDA/drivers/infra). Know your resume projects cold.",
    questions: [
      {
        id: "nvidia-coding-1",
        type: "coding",
        difficulty: "intermediate",
        prompt:
          "Given an array of integers, find the longest subarray with sum ≤ k (or equal to k if specified). Discuss sliding window vs prefix sums.",
        approach:
          "Clarify constraints (negatives?). Non-negative → sliding window; general → prefix + structure. State complexity clearly.",
        evaluating:
          "Constraint gathering and choosing the right algorithmic tool.",
      },
      {
        id: "nvidia-sd-1",
        type: "system_design",
        difficulty: "advanced",
        prompt: "How would you design a job queue that fans out GPU training jobs with fair sharing across teams?",
        approach:
          "Talk scheduling fairness, preemption, artifact storage, and observability. Stay high-level unless they pull you into CUDA details.",
        evaluating:
          "Systems vocabulary and prioritization under scarce accelerators.",
      },
      {
        id: "nvidia-role-1",
        type: "role_fit",
        difficulty: "beginner",
        prompt: "What part of NVIDIA’s stack excites you (systems, ML infra, graphics, developer tools), and what have you built that proves interest?",
        approach:
          "Pick one lane and connect a concrete project or coursework. Curiosity without cosplay.",
        evaluating:
          "Genuine signal vs buzzword alignment.",
      },
    ],
  },
  {
    company_slug: "Bloomberg",
    company_name: "Bloomberg",
    process_summary:
      "Often coding + C++/systems flavor depending on team, plus questions on reliability and data-heavy products. Expect practical debugging and clear communication under time pressure.",
    questions: [
      {
        id: "bbg-coding-1",
        type: "coding",
        difficulty: "intermediate",
        prompt:
          "Implement a rate limiter that allows N requests per rolling window per API key. What data do you store?",
        approach:
          "Sliding window log or approximate sliding counter. Discuss memory vs accuracy and multi-instance coordination.",
        evaluating:
          "Practical systems thinking and whether you validate behavior with burst examples.",
      },
      {
        id: "bbg-sd-1",
        type: "system_design",
        difficulty: "intermediate",
        prompt: "Design a service that stores and queries time-series market ticks for the last 24 hours with low latency reads.",
        approach:
          "Clarify write rate, query patterns, retention. Discuss append-optimized storage, indexing by symbol/time, and downsampling.",
        evaluating:
          "Ability to scope a data-heavy system and name bottlenecks without overbuilding.",
      },
      {
        id: "bbg-behavioral-1",
        type: "behavioral",
        difficulty: "beginner",
        prompt: "Describe a time you improved reliability or reduced errors in something you owned.",
        approach:
          "Show detection (metric/log), fix, and prevention (test/alert). Quantify if you can.",
        evaluating:
          "Operational maturity unusual for students — highly valued here.",
      },
    ],
  },
  {
    company_slug: "Netflix",
    company_name: "Netflix",
    process_summary:
      "Internship processes vary by team; expect coding, distributed-systems curiosity, and culture questions around freedom/responsibility. Be ready to discuss tradeoffs you’ve actually made.",
    questions: [
      {
        id: "nflx-coding-1",
        type: "coding",
        difficulty: "intermediate",
        prompt:
          "Design an in-memory hit counter that can return hits in the past 5 minutes. How do you expire old events efficiently?",
        approach:
          "Queue/deque of timestamps or bucketed counters. Explain cleanup on read/write and memory bounds.",
        evaluating:
          "Data structure fit and awareness of time-based expiration.",
      },
      {
        id: "nflx-sd-1",
        type: "system_design",
        difficulty: "intermediate",
        prompt: "Design a personalized homepage row (“Top Picks for You”) for a streaming app at internship scope.",
        approach:
          "Separate candidate generation, ranking, and caching. Define freshness and fallback when the model is cold. Stay honest about v1 vs v2.",
        evaluating:
          "Product + systems balance; knowing what to cut for an MVP.",
      },
      {
        id: "nflx-behavioral-1",
        type: "behavioral",
        difficulty: "beginner",
        prompt: "Tell me about a time you made a decision with incomplete information. How did you de-risk it?",
        approach:
          "Show the smallest experiment, the rollback plan, and what you learned. Ownership without recklessness.",
        evaluating:
          "Judgment under ambiguity — Netflix culture screen.",
      },
    ],
  },
  {
    company_slug: "Airbnb",
    company_name: "Airbnb",
    process_summary:
      "Often coding + cross-functional / belonging-oriented behavioral. Product sense helps. Expect thoughtful discussion of trust, marketplace dynamics, and inclusive collaboration.",
    questions: [
      {
        id: "abnb-coding-1",
        type: "coding",
        difficulty: "beginner",
        prompt:
          "Given check-in/check-out dates for bookings, determine if a new booking conflicts with existing ones for a listing.",
        approach:
          "Interval overlap checks; sort + sweep if many bookings. Clarify inclusive/exclusive checkout conventions.",
        evaluating:
          "Care with date boundaries and clear assumptions — marketplace bugs are costly.",
      },
      {
        id: "abnb-role-1",
        type: "role_fit",
        difficulty: "beginner",
        prompt: "How would you improve trust and safety for a new host onboarding flow?",
        approach:
          "Name one friction, one risk, and one metric. Propose a v1 UX change and how you’d A/B carefully.",
        evaluating:
          "Empathy for both sides of the marketplace and measurable thinking.",
      },
      {
        id: "abnb-behavioral-1",
        type: "behavioral",
        difficulty: "intermediate",
        prompt: "Tell me about a time you helped someone else succeed, not just yourself.",
        approach:
          "Concrete help (unblocking, documenting, pairing) with outcome for them and the team.",
        evaluating:
          "Collaboration and belonging signals beyond pure individual achievement.",
      },
    ],
  },
];

export function getInterviewBank(companySlug: string): CompanyInterviewBank | undefined {
  const needle = companySlug.toLowerCase();
  return COMPANY_INTERVIEW_BANKS.find((b) => b.company_slug.toLowerCase() === needle);
}

export function listInterviewBanks(): CompanyInterviewBank[] {
  return COMPANY_INTERVIEW_BANKS;
}
