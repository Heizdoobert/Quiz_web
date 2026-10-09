# README.md
lines:133 exports:
---
# Quick Quiz — Web3 Trivia & On-Chain Rewards

A Web3 trivia app built with **Next.js 16 (App Router)**, **Tailwind CSS v4**, **Supabase**, and **Wagmi / RainbowKit**. Players answer crypto trivia questions, climb global & group leaderboards, and earn **$QUIZ (ERC-20)** tokens and **Achievement Badge NFTs (ERC-721)** on Base Sepolia.

## Features

- **Trivia Engine**: 3D flip-card quiz UI with countdown timer, 50:50 lifeline, skip, and instant educational explanations.
- **Creator Dashboard (`/profile`)**: Manage your authored questions and download portable JSON backups with GDPR-compliant data portability.
- **Peer-Reviewed Question Lists (`/my-lists`, `/review`, `/contest`)**: Author custom question lists, submit them for peer-review consensus, and host community crypto contests.
- **On-Chain Rewards**: Earn **$QUIZ (ERC-20)** tokens and **Achievement Badge NFTs (ERC-721)** on Base Sepolia signed via EIP-712 typed vouchers.
- **Rankings & Groups**: Global & custom group leaderboards computed with PostgreSQL aggregation functions.
- **Hardened Security**: Cryptographic SIWE session authentication, dual-key Supabase RLS lockdown, anti-cheat answer masking, and OWASP HTTP security headers.
- **SEO & PWA Ready**: Dynamic metadata, sitemap, robots.txt, JSON-LD structured data, and web manifest.

## Getting Started

You need Node 22, a Supabase project and a WalletConnect (Reown) project ID.

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # then fill it in, see below
# apply the SQL in "Database Setup" to your Supabase project
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). The app refuses to start when a required variable is missing (see `lib/contracts/addresses.ts`, `components/Providers.tsx`, `lib/supabase/supabase.ts`).

### Environment Variables

Copy `.env.example` to `.env.local` (or `.env` for Docker) and configure your credentials.

Required:
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public Supabase client configuration.
- `SUPABASE_URL` & `SUPABASE_PUBLISHABLE_KEY`: The same project and publishable key, read by server code.
- `SUPABASE_SECRET_KEY`: Service-role access used only by Server Actions (answer grading, claim recording, rate limits). The session cookie's HMAC key is derived from it, so rotating it signs everyone out.
- `REWARD_SIGNER_PRIVATE_KEY`: Private key authorized to sign EIP-712 reward vouchers.
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: Reown/WalletConnect project ID for RainbowKit.
- `NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS`, `NEXT_PUBLIC_QUIZ_BADGE_ADDRESS`, `NEXT_PUBLIC_CONTEST_ESCROW_ADDRESS`, `NEXT_PUBLIC_CHAIN_ID`: Deployed contracts and chain. There are no defaults: the app throws at startup without them (placeholders are used only during `next build`).

Optional:
