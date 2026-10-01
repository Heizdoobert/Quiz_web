# docs/specs/contest-escrow.md
lines:144 exports:
---
# Spec: On-Chain Contest Escrow Smart Contract

## Objective
Enable decentralized, trustless, and Sybil-resistant crypto contests by deploying an on-chain **`ContestEscrow`** smart contract.

Contest creators deposit their chosen `$QUIZ` token reward pool into the escrow contract upfront. Players who complete contests earn EIP-712 signed claim vouchers based on verified quiz performance, which they redeem against the escrow contract. This replaces the currently paused backend minting and completely eliminates unbacked token inflation and creator self-drain exploits.

---

## Assumptions & Invariants
1. **ERC-20 Compatibility**: Escrow locks and transfers `$QUIZ` (`QuizToken.sol`) tokens.
2. **Deterministic Contest Identifiers**: Each contest corresponds to a unique Supabase `question_lists(id)` UUID, converted to `bytes32` via `keccak256(bytes(listId))`.
3. **No Unbacked Minting**: The escrow contract only pays out tokens that were deposited into it by the contest creator. The reward signer cannot mint new tokens into the escrow.
4. **Anti-Drain Guarantee**: Because the creator must fund the reward pool with their own tokens, authoring trivia questions and playing them with Sybil wallets can only ever return the creator's own deposited tokens (minus gas fees), eliminating economic profit from self-drain.
5. **EIP-712 Signature Verification**: Payouts require an off-chain cryptographic signature from `authorizedSigner` proving legitimate quiz completion.
6. **No Stuck Funds**: If a contest concludes or expires, the creator can reclaim any remaining unclaimed tokens after the contest deadline (`expiresAt`).

---

## Tech Stack & Commands
- **Smart Contracts**: Solidity `^0.8.24`, OpenZeppelin Contracts v5 (`IERC20`, `SafeERC20`, `EIP712`, `Ownable`, `ReentrancyGuard`, `ECDSA`).
- **Testing & Deployment**: Hardhat, Ethers / Viem, TypeScript.
- **Frontend / Full-Stack**: Next.js App Router, Wagmi v2, Viem.

### Commands
```bash
# Contract compilation
npm --prefix contracts run compile

# Contract test execution
npm --prefix contracts test

# Sync ABI and TypeScript addresses to frontend
npm --prefix contracts run sync-abi

# Web application validation
npm test
npm run type-check
npm run lint
npm run build
