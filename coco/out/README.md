# README.md
lines:157 exports:
---
# Quick Quiz — Trivia Game & Leaderboards

A trivia app built with **Next.js 16 (App Router)**, **Tailwind CSS v4** and **Supabase**, plus a Flutter client in [`mobile/`](mobile/). Players answer questions, build streaks and climb global and group leaderboards. It is a plain web2 app: sign in with a username and password or an email code (Google on mobile), and your score is kept per account. There is no wallet, token or blockchain component.

## Features

- **Trivia Engine**: 3D flip-card quiz UI with countdown timer, 50:50 lifeline, skip, and instant educational explanations.
- **Creator Dashboard (`/profile`)**: Manage your authored questions and download portable JSON backups.
- **Score & Rankings**: One point per correct answer, streaks, and global and group leaderboards computed with PostgreSQL aggregation functions.
- **Groups & Community**: Create or join groups, add questions, and rate, comment on and report questions.
- **Hardened Security**: Signed session cookies, dual-key Supabase RLS lockdown, anti-cheat answer masking, rate limits and OWASP HTTP security headers.
- **TypeScript SDK & API Gateway (`@heizdoobert/quickquiz-sdk`)**: Zero-dependency client with timeout, cancellation (`AbortSignal`), and automatic retries for idempotent requests; integrated via [`lib/sdk.ts`](lib/sdk.ts).
- **REST API v1 (`/api/v1`)**: the public JSON API behind the SDK, with auth, questions, quiz, leaderboard, groups, community and profile endpoints.
- **Remote Config**: flags such as `maintenance_mode` live in a Supabase table and reach web and mobile through `GET /api/config`, with no deploy (see [`sdk/remote_config`](sdk/remote_config/README.md)).
- **SEO Ready**: Dynamic metadata, sitemap, robots.txt, JSON-LD structured data, and web manifest.

## Getting Started

You need Node 22 and a Supabase project.

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # then fill it in, see below
# apply the SQL in "Database Setup" to your Supabase project
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). The app refuses to start when a required variable is missing (see `lib/sdk/supabase.ts`).

### Environment Variables

Copy `.env.example` to `.env.local` (or `.env` for Docker) and configure your credentials.

Required:
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public Supabase client configuration.
- `SUPABASE_URL` & `SUPABASE_PUBLISHABLE_KEY`: The same project and publishable key, read by server code.
- `SUPABASE_SECRET_KEY`: Service-role access used only by Server Actions (answer grading, rate limits). The session cookie's HMAC key is derived from it, so rotating it signs everyone out.

Optional:
- `GEMINI_API_KEY`: Google Gemini key for AI question generation and content moderation. Read by `@google/genai`; without it those features fail.
