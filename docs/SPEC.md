# Spec: Web3 Portfolio Quiz

## Objective
A Web3 quiz application where the client handles all rendering and UI, users submit answers via smart contract transactions, and a lightweight backend strictly verifies the contract events to update a leaderboard. 
- **Goal:** Provide a strong portfolio project demonstrating the ability to bridge Web3 interactions with a Web2 backend securely, while minimizing server stress.
- **User:** Potential employers/recruiters reviewing the portfolio, and users taking the quiz.

## Tech Stack
- **Frontend:** Next.js (React), Tailwind CSS
- **Web3 Integration:** wagmi / viem
- **Smart Contract:** Solidity, Foundry (Targeting Sepolia testnet)
- **Backend / Leaderboard:** Next.js API Routes + Prisma ORM with SQLite or Postgres.

## Commands
- `npm run dev` — Start the local development server (frontend + API routes)
- `npm run build` — Build for production
- `npm run test` — Run tests
- `npm run lint` — Lint code
- `forge test` — Run smart contract tests

## Project Structure
```text
/
├── contracts/        → Solidity smart contracts
├── test/             → Smart contract tests
├── src/
│   ├── app/          → Next.js pages and API routes (the lightweight backend)
│   ├── components/   → React UI components (quiz interface, leaderboard)
│   ├── lib/          → Shared utilities, web3 config, Prisma client
│   └── styles/       → Global CSS / Tailwind
├── prisma/           → Database schema for the leaderboard
└── docs/             → Project documentation and intent
```

## Code Style
- **TypeScript:** Strict mode enabled, explicit return types for API routes and contract interactions.
- **Components:** Functional components with React Hooks.
- **Example:**
```tsx
export async function POST(req: Request) {
  // Server explicitly only handles verification
  const { transactionHash } = await req.json();
  const isValid = await verifyContractEvent(transactionHash);
  if (isValid) {
    await updateLeaderboard();
  }
  return Response.json({ success: isValid });
}
```

## Testing Strategy
- **Smart Contracts:** 100% branch coverage for answer submission and event emission.
- **Frontend:** React Testing Library for core UI flows (wallet connect, answering questions).
- **Backend/API:** Integration tests verifying that fake/invalid transactions are rejected by the server.

## Boundaries
- **Always:** Rely on the smart contract as the source of truth for whether a user answered correctly.
- **Ask first:** Before adding new heavy dependencies or altering the database schema.
- **Never:** Let the server render UI views, store the quiz questions, or manage user passwords (rely on wallet authentication).

## Success Criteria
- [ ] Users can connect their Web3 wallet to the client.
- [ ] Quiz questions are fetched entirely on the client (from contract or IPFS/static file).
- [ ] User submits answers via a smart contract transaction.
- [ ] The server listens for or verifies the transaction and updates a global leaderboard.
- [ ] The server never serves or renders the quiz state directly.

