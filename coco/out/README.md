# README.md
lines:100 exports:
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

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.example` to `.env.local` (or `.env` for Docker) and configure your credentials:
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public Supabase client configuration.
- `SUPABASE_URL` & `SUPABASE_SECRET_KEY`: Service-role access used only by Server Actions (answer grading, claim recording). The session cookie's HMAC key is derived from `SUPABASE_SECRET_KEY`, so rotating it signs everyone out.
- `REWARD_SIGNER_PRIVATE_KEY`: Private key authorized to sign EIP-712 reward vouchers.
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: Reown/WalletConnect project ID for RainbowKit.
- `NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS`, `NEXT_PUBLIC_QUIZ_BADGE_ADDRESS`, `NEXT_PUBLIC_CONTEST_ESCROW_ADDRESS`, `NEXT_PUBLIC_CHAIN_ID`: Deployed contracts and chain (defaults in `lib/contracts/addresses.ts`).
- `NEXT_PUBLIC_APP_URL`: Public base URL for canonical links, sitemap and Open Graph tags. Falls back to Vercel's production domain, then `http://localhost:3000`.
- `TREASURY_WALLET_ADDRESS` (optional): Wallet that receives $QUIZ swept from wallet-less accounts after 180 days. Unset means no sweep.
- `NEXT_PUBLIC_PAYMASTER_URL` (optional): Paymaster for gasless claims. `NEXT_PUBLIC_SPONSOR_AD_URL` (optional): sponsor link.
- `NEXT_PUBLIC_APP_ENV=preview` (optional): Marks a non-Vercel deployment as preview (noindex).

### Database Setup

Run these in the Supabase SQL Editor, in this order (a Supabase branch first, then production). Every script is idempotent and safe to re-run. This is the order `tests/sql/run-accounts-migration.sh` verifies.

