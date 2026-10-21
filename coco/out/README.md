# README.md
lines:79 exports:
---
# Quick Quiz

A modern web & mobile trivia application where players answer questions, build streaks, and compete on leaderboards.

- **Web:** Next.js 16 (App Router), Tailwind CSS v4, Supabase
- **Mobile:** Flutter (Android & iOS)
- **SDK:** TypeScript SDK (`@heizdoobert/quickquiz-sdk`)

---

## 🚀 Quick Start

### 1. Web App

**Prerequisites:** Node 22, Supabase project.

```bash
# Install dependencies
npm install --legacy-peer-deps

# Setup environment
cp .env.example .env.local

# Run development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> Database migrations are located in [`supabase/migrations/`](supabase/migrations/). Follow [`docs/migrations.md`](docs/migrations.md) for full setup instructions.

---

### 2. Mobile App (Flutter)

Located in [`mobile/`](mobile/).

```bash
cd mobile

# Install dependencies
