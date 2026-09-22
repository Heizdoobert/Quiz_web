# Quick Quiz - Next.js, Supabase, and Web3 Migration Design

## 1. Overview
Migrate the existing vanilla HTML/JS/CSS "Quick Quiz" application to a modern Next.js (App Router) full-stack application. The new architecture integrates Supabase for off-chain storage and Web3 smart contracts for on-chain interactions, turning the quiz into a tokenized experience where users risk and earn tokens per question.

## 2. Architecture
* **Frontend**: Next.js (App Router), React Components, Tailwind CSS.
* **Authentication**: Web3 Wallet connection (using tools like Wagmi and Web3Modal or RainbowKit).
* **Database**: Supabase (PostgreSQL) for storing questions, user profiles, group metadata, and caching leaderboards.
* **Blockchain**: A Smart Contract handles the core logic of verifying answers and transferring tokens per question (users pay gas to submit answers).

## 3. Database Schema (Supabase)
* **`users`**
  * `wallet_address` (PK, string)
  * `display_name` (string)
  * `created_at` (timestamp)
* **`groups`**
  * `id` (uuid, PK)
  * `name` (string)
  * `description` (text)
  * `owner_wallet` (string, references `users.wallet_address`)
* **`group_members`**
  * `group_id` (uuid, references `groups.id`)
  * `wallet_address` (string, references `users.wallet_address`)
* **`questions`**
  * `id` (uuid, PK)
  * `category` (string)
  * `prompt` (string)
  * `options` (jsonb array of strings)
  * `explanation` (text, nullable)
  * `created_by` (string, references `users.wallet_address`)
* **`leaderboards`**
  * Global and Group rankings based on on-chain token balances and stats, cached in Supabase for fast UI reads.

## 4. Web3 Transaction Flow
1. **Fetch Question**: Next.js fetches a question from Supabase.
2. **Answer Submission**: User selects an option and confirms the transaction in their wallet, calling `submitAnswer(questionId, answerIndex)` on the Smart Contract.
3. **Pending State**: The UI shows a "Transaction Pending..." state while waiting for block confirmation.
4. **Resolution**: The Smart Contract evaluates the answer. If correct, it mints/transfers reward tokens to the user; if wrong, it deducts tokens.
5. **UI Update**: The card flips to show the result, explanation, and the token balance update. Supabase indexers/webhooks listen to on-chain events to update the cached leaderboard.

## 5. UI Components
* **Header**: Contains the "Connect Wallet" button and Theme/Sound toggles.
* **Quiz Card**: 3D flip card adapted for asynchronous Web3 transactions.
* **Sidebar**:
  * **Stats**: Displays on-chain token balance, accuracy, streak.
  * **Groups**: UI to create/join groups and view group leaderboards.
  * **Leaderboard**: Global top players.
* **Custom Question Form**: React form to submit new questions to Supabase.

## 6. Error Handling
* **Transaction Rejections**: Display clear error messages if a user cancels the wallet transaction.
* **Insufficient Funds/Gas**: Detect and warn users if they cannot afford the transaction.
* **Network Mismatch**: Prompt users to switch to the correct blockchain network.
