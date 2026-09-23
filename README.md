# Quick Quiz — Full-Stack Web3 Quiz & On-Chain Rewards Platform

A modern, responsive, full-stack Web3 trivia and quiz application built with **Next.js 16 (App Router)**, **Tailwind CSS v4**, **Supabase PostgreSQL**, **Wagmi / RainbowKit / Viem**, and **Solidity Smart Contracts (Hardhat)**.

It features anti-cheat server-side answer verification, real-time statistics, global & group guild leaderboards, responsive ad zones, 3D flip card interactions, and an on-chain reward economy powered by **ERC-20 ($QUIZ)** tokens and **ERC-721 Achievement Badge NFTs** on Base Sepolia via **EIP-712** server-signed vouchers.

---

## Architecture Overview

```
quick-quiz/
├── app/                           # Next.js App Router (SSR initial data, error/loading boundaries)
│   ├── layout.tsx                 # Root layout with Metadata, Fonts, and JSON-LD Structured Data
│   ├── page.tsx                   # SSR Home Page (pre-fetches initial question, leaderboard & Quiz schema)
│   ├── loading.tsx                # Streaming loading skeleton
│   ├── error.tsx                  # Error boundary with recovery action
│   ├── not-found.tsx              # Custom 404 page
│   ├── sitemap.ts                 # Dynamic XML sitemap generator
│   ├── robots.ts                  # Search engine robots.txt configuration
│   ├── manifest.ts                # Web App Manifest (PWA) configuration
│   └── globals.css                # Tailwind CSS v4 and 3D card perspective utilities
├── components/                    # UI Component Library
│   ├── Header.tsx                 # Web3 ConnectButton + animated Rewards button + Audio toggle
│   ├── Providers.tsx              # RainbowKit, Wagmi, React Query providers (Base Sepolia + EVM)
│   ├── QuizLayout.tsx             # Central UI grid coordinating Sidebar, QuizCard, Leaderboards
│   ├── QuizCard.tsx               # 3D Flip Card wrapper with Confetti & Keyboard Nav
│   ├── QuestionFront.tsx          # Card front with Sponsor Gate, Timer, 50:50/Skip, and Options
│   ├── AnswerBack.tsx             # Card back with Result feedback, Explanation, and Dispute button
│   ├── SeoFaqSection.tsx          # Semantic SEO & Knowledge FAQ accordion
│   ├── QuestionForm.tsx           # Community question submission accordion with heuristic audit
│   ├── Sidebar.tsx                # Left column coordinating stats, history, and rewards summary
│   ├── StatsPanel.tsx             # Live score, streak counter, accuracy, and claimable tokens
│   ├── HistoryList.tsx            # Recent question answer history with outcome pills
│   ├── LeaderboardPanel.tsx       # Tabbed leaderboard (Global Top 10 + Group Rankings with pagination)
│   ├── CategoryBar.tsx            # Topic selector (All, DeFi, NFT & Gaming, Layer 1 & Infra)
│   ├── AdZone.tsx                 # Responsive ad placement (skyscrapers on desktop, banners on mobile)
│   ├── StickyBannerAd.tsx         # Fixed bottom banner ad zone
│   ├── Modal.tsx                  # Accessible Framer Motion portal base modal
│   └── modals/
│       ├── IntroModal.tsx         # How to play guide
│       ├── TimerSettingsModal.tsx # Countdown mode and duration configuration
│       ├── GroupModal.tsx         # Group creation and joining interface
│       ├── ReviewModal.tsx        # Comprehensive question review modal
│       ├── RewardsModal.tsx       # Dual-tab $QUIZ token claiming & NFT badge minting
│       ├── ProfileModal.tsx       # Web3 identity, player rank tiers, and NFT trophy cabinet
│       └── DisputeModal.tsx       # Community question dispute reporting modal
├── hooks/                         # Clean Architecture Custom Hooks
│   ├── use-quiz-logic.ts          # Core game loop, timer countdown, and sponsor gate state
│   ├── use-question-form.ts       # Form validation and heuristic question verification
│   ├── use-dispute-modal.ts       # Question dispute submission and state
│   ├── use-group-modal.ts         # Group management and membership
│   └── use-rewards-modal.ts       # Web3 contract write actions and claim flow
├── lib/
│   ├── actions/                   # Next.js Server Actions (Mutation & Data Fetching)
│   │   ├── question-actions.ts    # Question fetching & deterministic 50:50 elimination
│   │   ├── quiz-actions.ts        # Anti-cheat answer verification & stats calculation
│   │   ├── leaderboard-actions.ts # Global and group leaderboard aggregation with pagination
│   │   ├── user-actions.ts        # User registration and profile management
│   │   ├── group-actions.ts       # Group creation, joining, and membership queries
│   │   └── reward-actions.ts      # EIP-712 cryptographic voucher signing & claim verification
│   ├── contracts/                 # Contract ABIs & Address Configuration
│   │   ├── addresses.ts           # Live Base Sepolia deployed contract addresses
│   │   ├── QuizTokenABI.ts        # Typed ERC-20 QuizToken ABI (as const)
│   │   └── QuizBadgeNFTABI.ts     # Typed ERC-721 QuizBadgeNFT ABI (as const)
│   ├── audio.ts                   # Web Audio API Synthesizer (Flip, Tick, Correct, Wrong, Powerup)
│   ├── schema.sql                 # PostgreSQL DDL with RLS policies, seed trivia, and dispute tables
│   ├── supabase.ts                # Supabase client singleton with build-time fallback
│   └── types.ts                   # Domain TypeScript interfaces and badge definitions
└── contracts/                     # Hardhat Smart Contract Workspace
    ├── contracts/
    │   ├── QuizToken.sol          # ERC-20 $QUIZ token with EIP-712 claimTokens()
    │   └── QuizBadgeNFT.sol       # ERC-721 badge NFT with EIP-712 mintBadge()
    ├── test/
    │   ├── QuizToken.test.ts      # 8 unit tests (replay, deadline, tampering, rotation)
    │   └── QuizBadgeNFT.test.ts   # 8 unit tests (duplicate badge, replay, URI, bounds)
    ├── scripts/
    │   ├── deploy.ts              # Deployment script for Base Sepolia and local networks
    │   └── sync-abi.ts            # ABI extraction script syncing to lib/contracts/
    └── hardhat.config.ts          # Solidity 0.8.24 compiler with Cancun EVM & optimizer
```

---

## Key Features

### 1. Web3 Wallet Authentication & Live Contracts
- Integrated with **RainbowKit v2** and **Wagmi v2** (Project ID configured).
- Deployed on **Base Sepolia (Chain ID: 84532)**:
  - **QuizToken ($QUIZ)**: `0x76444237b7d382703d20CFFF4Af19f429CFbdE33`
  - **QuizBadgeNFT (QBADGE)**: `0x6629cE07d7c4093ccb0a7bEdDDBe6cF41f9A93F9`
  - **Deployer / Signer**: `0xEAa6c3b72E09b7B9a7656C1140761823D024aC28`

### 2. Pre-Quiz Sponsor / Affiliate Gate (Guaranteed Monetization)
- **Zero Reload Experience**: Before starting a question, users click a prominent "Start Quiz / Unlock Sponsor" button.
- **New Tab Redirection**: Opens the configured sponsor/affiliate URL (`NEXT_PUBLIC_SPONSOR_AD_URL`) in a new browser tab without reloading the main quiz window.
- **Timer Protection**: The 30s countdown timer remains safely paused at maximum until the user unlocks the question.

### 3. Anti-Cheat Security & Community Dispute Engine
- **Server Verification**: Answers evaluated strictly in `'use server'` actions (`submitAnswer`). Correct indices never leak to the client.
- **Deterministic 50:50**: Power-up elimination uses a deterministic hash so malicious users cannot deduce wrong answers by spamming.
- **Community Dispute System**: Players can flag controversial or incorrect questions. Questions receiving ≥3 disputes are automatically quarantined from the public pool.

### 4. Web Audio API Synthesizer
- Built-in zero-dependency procedural audio engine (`lib/audio.ts`) with sound effects for Card Flip, Countdown Tick, Correct Answer, Wrong Answer, and Powerups.
- Mute/Unmute state persisted in user storage.

### 5. On-Chain Token & NFT Rewards
- **$QUIZ Token (ERC-20)**: Players earn 10 $QUIZ tokens per verified correct answer. Claims are signed off-chain via **EIP-712** vouchers.
- **Achievement Badges (ERC-721)**: Milestone NFT badges (Leaderboard Champion, Streak Fire, Century Quizzer, Perfect Round).
- **Zero Gas Cost for Host**: The user submits the transaction and pays fractional-cent L2 gas (~$0.001) on Base Sepolia.

### 6. Full-Stack Google SEO & Rich Snippets (Schema.org)
- **JSON-LD Structured Data**: Injects schema.org `WebSite`, `WebApplication`, `FAQPage`, and dynamic educational `Quiz` / `Question` multiple-choice schemas into server-rendered HTML for maximum Google SERP real estate.
- **Automated Metadata Routes**: Dynamic `app/sitemap.ts` (`/sitemap.xml`) and `app/robots.ts` (`/robots.txt`).
- **Progressive Web App (PWA)**: Configured `app/manifest.ts` and responsive cyberpunk SVG icons (`public/icon.svg`).
- **OpenGraph & Twitter Cards**: Complete social preview tags with canonical URL safeguards.
- **Semantic SEO Content**: Integrated crawlable FAQ and platform overview accordion (`components/SeoFaqSection.tsx`).

---

## Environment Variables Configuration

Create a `.env` (or `.env.local`) file in the project root:

```bash
# ==========================================
# 1. Supabase Database Configuration
# ==========================================
NEXT_PUBLIC_SUPABASE_URL=https://xtzxpsoqvptmakplifsk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL=https://xtzxpsoqvptmakplifsk.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SECRET_KEY=sbp_...

# ==========================================
# 2. Web3 / RainbowKit Configuration
# ==========================================
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=9154b31ebedb68f2c7a64cade158238e

# ==========================================
# 3. On-Chain Rewards (Base Sepolia Chain ID 84532)
# ==========================================
# Server-only private key used to sign EIP-712 claim vouchers (NEVER prefix with NEXT_PUBLIC_)
REWARD_SIGNER_PRIVATE_KEY=0x_your_server_reward_signer_private_key

# Live Deployed Contract Addresses on Base Sepolia
NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS=0x76444237b7d382703d20CFFF4Af19f429CFbdE33
NEXT_PUBLIC_QUIZ_BADGE_ADDRESS=0x6629cE07d7c4093ccb0a7bEdDDBe6cF41f9A93F9
NEXT_PUBLIC_CHAIN_ID=84532

# ==========================================
# 4. Pre-Quiz Sponsor / Affiliate Monetization
# ==========================================
# Opens sponsor or affiliate link in a new tab without reloading before unlocking the quiz question
NEXT_PUBLIC_SPONSOR_AD_URL=https://coinzilla.com
```

---

## Database Setup (Supabase)

1. Open your [Supabase Dashboard](https://supabase.com).
2. Navigate to the **SQL Editor**.
3. Copy and run the entire content of [`lib/schema.sql`](lib/schema.sql).
4. This will create all tables, indexes, Row Level Security policies, and the secure `client_questions` view.

---

## Smart Contract Development & Deployment

The smart contracts reside in the isolated `contracts/` workspace:

### 1. Compile Contracts
```bash
cd contracts
npm install
npm run compile
```

### 2. Run Test Suite (16 Test Cases)
```bash
npm run test
```

### 3. Deploy to Base Sepolia
1. Create a `contracts/.env` file:
   ```bash
   DEPLOYER_PRIVATE_KEY=0x_your_funded_deployer_wallet_private_key
   BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   REWARD_SIGNER_ADDRESS=0x_public_address_matching_REWARD_SIGNER_PRIVATE_KEY
   ```
2. Fund the deployer address with free testnet ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet).
3. Run the deployment script:
   ```bash
   npm run deploy:base-sepolia
   ```
4. Sync ABIs to Next.js:
   ```bash
   npm run sync-abi
   ```
5. Copy the deployed contract addresses into your root `.env` file (`NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS` and `NEXT_PUBLIC_QUIZ_BADGE_ADDRESS`).

---

## Local Development & Production Build

### Install Dependencies
```bash
npm install
```

### Run Local Development Server
```bash
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) in your browser.

### Run Linting & Type Checking
```bash
npm run lint
```

### Production Build
```bash
npm run build
npm run start
```

### Docker Container Deployment
The application includes automated Docker containerization:
```bash
# Build and run web container in background
npm run docker:up

# Or manually via Docker Compose
docker compose build web
docker compose up -d web

# View container logs
docker compose logs -f web
```

---

## Production vs. Preview Deployment (Git Branches)

This repository follows a strict two-branch deployment strategy for continuous integration and hosting (e.g. on Vercel):

### 1. Branch: `main` (Production)
- **Target**: Production environment (`https://your-production-domain.com`).
- **Configuration**: Uses production Supabase credentials and deployed production contract addresses.
- **Policy**: Only verified, fully-tested code with passing CI builds is pushed to `main`.

### 2. Branch: `preview` (Preview & Staging)
- **Target**: Preview environments (pull requests, staging URLs).
- **Configuration**: Connected to staging Supabase instances or testnet contracts for testing experimental features, UI updates, and new quiz mechanics before merging to production.

---

## License

MIT License. Designed and built with Next.js, Wagmi, and Solidity.
