# samehere

samehere is a verified student networking platform for engineering students who want real peer connections instead of recruiter noise. It uses .edu email verification as the access gate and Claude to power AI-driven peer matching based on student profiles.

**Status: in early development.** Project setup is in progress. The sections below describe the planned v1 scope and will be updated as features ship.

**Live:** coming soon

## The problem

Engineering students don't have a dedicated space that combines verified peer identity, real community, and meaningful connection. LinkedIn is built for professionals, not students still learning. Discord servers are unstructured and easy to get lost in. samehere is built around student identity as the foundation, so the people you connect with are genuinely your peers.

## What is planned for v1

### Authentication and access

- .edu email verification as the platform's access gate
- Supabase Auth handling sign up, sign in, and session persistence
- Auth-gated routes so only verified students reach the app

### Student profiles

- Capture school, year, interests, and background
- Editable profile that feeds into the matching system

### AI peer matching

- Claude API compares student profiles and returns a match with reasoning
- The core differentiating feature of the platform

### Social feed

- Lightweight posting and engagement between students
- Basic feed view on the authenticated dashboard

### Contribution tracker

A GitHub-style activity heatmap displayed on every student profile showing daily engagement. Activity is tracked in tiers with quality gates to prevent low-effort gaming.

| Action | Minimum requirement | Points |
|---|---|---|
| Profile update | Meaningful field updated (bio, skills, project — not avatar) | 1 |
| Connection accepted | Mutual acceptance by both users | 2 |
| Comment | 50+ characters | 3 |
| Post published | 150+ characters | 5 |

Each action type counts once per day. Daily square intensity reflects total points earned. Profile updates have a weekly cooldown. All minimums are enforced server-side.

## What is not implemented yet

- Direct messaging between students
- Student-ID-gated job board
- Pro tier subscription and payment handling
- Any of the v1 features listed above (project is still being scaffolded)

## Tech stack

### Client

- Next.js
- TypeScript
- Tailwind CSS

### Backend and data

- Supabase (Postgres, Auth, Row Level Security)

### AI

- Claude through the Anthropic API

### Hosting

- Vercel

## Why this project

This is a personal portfolio project built to develop full-stack skills with a real product behind it, not a tutorial clone. The problem it solves is one I've run into directly as a self-taught, non-traditional CS student looking for peers at a similar stage.

## Author

Dev Goswami

- Portfolio: https://builtbyd3v.com
- LinkedIn: https://linkedin.com/in/builtbydev
