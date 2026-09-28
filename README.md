# Quick Quiz — Web3 Trivia & On-Chain Rewards

A Web3 trivia app built with **Next.js 16 (App Router)**, **Tailwind CSS v4**, **Supabase**, and **Wagmi / RainbowKit**. Players answer crypto trivia questions, climb global & group leaderboards, and earn **$QUIZ (ERC-20)** tokens and **Achievement Badge NFTs (ERC-721)** on Base Sepolia.

## Features

- Global and group leaderboards with pagination
- 3D flip-card quiz UI with timer, 50:50 power-up, and skip
- On-chain $QUIZ token and NFT badge rewards
- Community question submission and dispute flow
- SEO-ready: sitemap, robots.txt, JSON-LD structured data, PWA manifest

## Getting Started

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your own Supabase, WalletConnect, and contract values. Do not commit real keys.

### Database

Run [`lib/schema.sql`](lib/schema.sql) in the Supabase SQL Editor to create tables and seed data, then run [`lib/sql/stats-functions.sql`](lib/sql/stats-functions.sql) for the stats and leaderboard functions (safe to re-run).

### Smart Contracts

```bash
cd contracts
npm install
npm run compile
npm run test
```

See `contracts/scripts/deploy.ts` for deployment.

### Build & Lint

```bash
npm run lint
npm run build
npm run start
```

## Branches

- `main` — production
- `preview` — staging / preview deployments

## License

MIT
