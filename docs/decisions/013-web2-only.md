# ADR-013: Web2 Only: Remove Wallet, Token and Contract Code

## Status
Accepted (requested by the project owner, 2026-10-09). Supersedes ADR-001, ADR-003, ADR-007, ADR-011 and ADR-012.

## Context
The app grew a Web3 layer: Sign-In with Ethereum, optional wallets on accounts, $QUIZ token and NFT badge rewards signed as EIP-712 vouchers, and peer-reviewed question lists that could run as funded contests through an escrow contract. That layer needed wagmi, viem, RainbowKit and WalletConnect on the client, a Hardhat project and CI job, a signer private key on the server, and rules about wallet-less accounts holding rewards.

The product goal is now a plain trivia game where the reward is the score.

## Decision
Remove everything that depends on a wallet, a token or a chain:

- Sign-in is username and password, email code, or Google (mobile). Sessions and mobile bearer tokens carry only the account id (`id.exp.mac`).
- Rewards are the score, streak and leaderboard rank. There are no tokens, badges, vouchers or claims.
- Question lists, contests, the review queue and the escrow flow are removed with the rewards they existed to pay.
- The `contracts/` project, its CI job, the wallet dependencies and the wallet environment variables are removed.

## Consequences
- Accounts that only had a wallet (no username, email or Google login) cannot sign in any more.
- Everyone is signed out once: the session and mobile token formats changed.
- The database is not touched by this change. Tables and columns for rewards, escrow and wallets stay, unused, until a separate migration drops them after a backup; every wallet column was already nullable (`accounts.sql`), so the new code writes without them.
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`, the contract addresses, `REWARD_SIGNER_PRIVATE_KEY` and `TREASURY_WALLET_ADDRESS` can be deleted from every environment.
- The bundle-size figures in `CONSTRAINTS.md` predate the removal and need re-measuring.
