# Quick Quiz — Full-Stack Web3 Quiz & On-Chain Rewards Platform

A modern, responsive, full-stack Web3 trivia and quiz application built with **Next.js 16 (App Router)**, **Tailwind CSS v4**, **Supabase PostgreSQL**, **Wagmi / RainbowKit / Viem**, and **Solidity Smart Contracts (Hardhat)**.

It features anti-cheat server-side answer verification, real-time statistics, global & group guild leaderboards, responsive ad zones, 3D flip card interactions, and an on-chain reward economy powered by **ERC-20 ($QUIZ)** tokens and **ERC-721 Achievement Badge NFTs** on Base Sepolia via **EIP-712** server-signed vouchers.

---

## Architecture Overview

```
quick-quiz/
├── app/                           # Next.js App Router (SSR initial data, error/loading boundaries)
│   ├── layout.tsx                 # Root layout with Inter font and Web3 Providers
│   ├── page.tsx                   # SSR Home Page (pre-fetches initial question & leaderboard)
│   ├── loading.tsx                # Streaming loading skeleton
│   ├── error.tsx                  # Error boundary with recovery action
│   ├── not-found.tsx              # Custom 404 page
│   └── globals.css                # Tailwind CSS v4 and 3D card perspective utilities
├── components/                    # UI Component Library
│   ├── Header.tsx                 # Web3 ConnectButton + animated Rewards button
│   ├── Providers.tsx              # RainbowKit, Wagmi, React Query providers (Base Sepolia + EVM)
│   ├── QuizLayout.tsx             # Central state manager and responsive 3-column grid
│   ├── QuizCard.tsx               # 3D Flip Card wrapper with keyboard navigation & confetti
│   ├── QuestionFront.tsx          # Card front with timer, power-ups (50:50, Skip), and options
│   ├── AnswerBack.tsx             # Card back with result feedback, explanation, and next action
│   ├── QuestionForm.tsx           # Collapsible custom question submission accordion
│   ├── Sidebar.tsx                # Left column coordinating stats, history, and rewards summary
│   ├── StatsPanel.tsx             # Live score, streak counter, accuracy, and claimable tokens
│   ├── HistoryList.tsx            # Recent question answer history with outcome pills
│   ├── LeaderboardPanel.tsx       # Tabbed leaderboard (Global Top 10 + Group Rankings)
│   ├── GlobalLeaderboard.tsx      # Global player ranking table
│   ├── GroupLeaderboard.tsx       # Guild/group ranking table with member selector
│   ├── AdZone.tsx                 # Responsive ad placement (skyscrapers on desktop, banners on mobile)
│   ├── Modal.tsx                  # Accessible Framer Motion portal base modal
│   └── modals/
│       ├── IntroModal.tsx         # How to play guide
│       ├── TimerSettingsModal.tsx # Countdown mode and duration configuration
│       ├── GroupModal.tsx         # Group creation and joining interface
│       ├── ReviewModal.tsx        # Comprehensive question review modal
│       └── RewardsModal.tsx       # Dual-tab $QUIZ token claiming & NFT badge minting
├── lib/
│   ├── actions/                   # Next.js Server Actions (Mutation & Data Fetching)
│   │   ├── question-actions.ts    # Question fetching & deterministic 50:50 elimination
│   │   ├── quiz-actions.ts        # Anti-cheat answer verification & stats calculation
│   │   ├── leaderboard-actions.ts # Global and group leaderboard aggregation
│   │   ├── user-actions.ts        # User registration and profile management
│   │   ├── group-actions.ts       # Group creation, joining, and membership queries
│   │   └── reward-actions.ts      # EIP-712 cryptographic voucher signing & claim verification
│   ├── contracts/                 # Contract ABIs & Address Configuration
│   │   ├── addresses.ts           # Deployed contract addresses with environment fallbacks
│   │   ├── QuizTokenABI.ts        # Typed ERC-20 QuizToken ABI (as const)
│   │   └── QuizBadgeNFTABI.ts     # Typed ERC-721 QuizBadgeNFT ABI (as const)
│   ├── schema.sql                 # PostgreSQL DDL with RLS policies and secure views
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
    │   ├── deploy.ts              # Deployment script for Base Sepolia and local Anvil
    │   └── sync-abi.ts            # ABI extraction script syncing to lib/contracts/
    └── hardhat.config.ts          # Solidity 0.8.24 compiler with Cancun EVM & optimizer
```

---

## Key Features

### 1. Web3 Wallet Authentication
- Integrated with **RainbowKit v2** and **Wagmi v2**.
- Multi-chain support: **Base Sepolia (primary for rewards)**, Base, Arbitrum, Polygon, Optimism, Ethereum Mainnet.
- Network switching prompt when connected to an unsupported network during reward claims.

### 2. Anti-Cheat Security & Row Level Security (RLS)
- **Data Isolation**: Question `correct_index` and `explanation` are strictly withheld from client-side bundles prior to submission.
- **Server Verification**: Answers are evaluated in `'use server'` actions (`submitAnswer`).
- **Deterministic 50:50**: Power-up elimination uses a deterministic string hash of `questionId` so malicious users cannot deduce all wrong answers by spamming the endpoint.
- **Database RLS**: Supabase tables (`users`, `questions`, `quiz_results`, `groups`, `group_members`, `reward_claims`) enforce Row Level Security policies.

### 3. On-Chain Token & NFT Rewards
- **$QUIZ Token (ERC-20)**: Players earn 10 $QUIZ tokens per verified correct answer. Claims are signed off-chain by the server and minted on-chain on Base Sepolia.
- **Achievement Badges (ERC-721)**: Milestone NFT badges:
  - 🏆 **Leaderboard Champion**: Reaching Top 3 globally.
  - 🔥 **Streak Fire**: Achieving a 10+ correct answer streak.
  - 💯 **Century Quizzer**: Answering 100+ total trivia questions.
  - ⭐ **Perfect Round**: Flawless quiz sessions.
- **EIP-712 Cryptographic Signatures**: The server signs a typed structured data voucher with `REWARD_SIGNER_PRIVATE_KEY`. Zero gas cost for the backend; the user submits the transaction and pays fractional-cent L2 gas on Base Sepolia.

### 4. Responsive Monetization Ad Zones
- **Skyscraper Slots**: Fixed sticky skyscraper sidebars (160×600) on desktop displays (`≥1280px`).
- **Horizontal Banners**: Fluid responsive banners (728×90 / 320×50) positioned above and below the quiz arena for tablets and smartphones.

---

## Environment Variables Configuration

Create a `.env` (or `.env.local`) file in the project root:

```bash
# ==========================================
# 1. Supabase Database Configuration
# ==========================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# ==========================================
# 2. Web3 / RainbowKit Configuration
# ==========================================
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id

# ==========================================
# 3. On-Chain Rewards (Base Sepolia)
# ==========================================
# Server-only private key used to sign EIP-712 claim vouchers (NEVER prefix with NEXT_PUBLIC_)
REWARD_SIGNER_PRIVATE_KEY=0x_your_server_reward_signer_private_key

# Deployed contract addresses (populated after contract deployment)
NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS=0x_deployed_quiz_token_address
NEXT_PUBLIC_QUIZ_BADGE_ADDRESS=0x_deployed_quiz_badge_address
NEXT_PUBLIC_CHAIN_ID=84532
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
