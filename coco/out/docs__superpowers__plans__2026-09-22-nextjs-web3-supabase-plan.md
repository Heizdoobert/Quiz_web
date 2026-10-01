# docs/superpowers/plans/2026-09-22-nextjs-web3-supabase-plan.md
lines:227 exports:supabase,Providers,metadata,default
---
# Quick Quiz Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Quick Quiz from vanilla HTML/JS to a Next.js App Router app integrated with Supabase and Web3.

**Architecture:** Next.js (App Router), React, Tailwind CSS. Supabase for database storage and cached leaderboards. Web3 (Wagmi/RainbowKit) for wallet authentication and smart contract interaction per question.

**Tech Stack:** Next.js, React, Tailwind CSS, Supabase JS Client, Wagmi, Viem, RainbowKit, TypeScript (optional but recommended, we will use JS/TS).

**Spec:** `docs/superpowers/specs/2026-09-22-nextjs-web3-supabase-design.md`

## Global Constraints
- Use Next.js App Router (`app` directory).
- Use Tailwind CSS for all styling (replace `style.css`).
- Use Wagmi and RainbowKit for Web3 Wallet Connection.
- Keep the existing visual identity (study mood, dark theme).

---

### Task 1: Project Scaffolding & Cleanup

**Files:**
- Create: `package.json`, `next.config.js`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Delete: `index.html`, `script.js`, `style.css`, `build.js`

**Interfaces:**
- Produces: Base Next.js application ready for development.

- [ ] **Step 1: Scaffold Next.js in current directory**
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir false --import-alias "@/*" --force
```

- [ ] **Step 2: Install dependencies**
```bash
npm install @supabase/supabase-js wagmi viem @rainbow-me/rainbowkit @tanstack/react-query framer-motion canvas-confetti lucide-react
```

