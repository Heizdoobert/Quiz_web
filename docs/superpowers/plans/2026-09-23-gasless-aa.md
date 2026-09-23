# Gasless Transactions (Account Abstraction) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable players to claim `$QUIZ` tokens and mint `QBADGE` NFTs completely free of gas fees using Coinbase Smart Wallet and a Paymaster.

**Architecture:** Update Wagmi configuration to support Coinbase Smart Wallet. Refactor the rewards claiming logic in `use-rewards-modal.ts` to utilize EIP-5792 `useWriteContracts` with a `capabilities` parameter pointing to our Paymaster URL, falling back to standard transactions for traditional EOAs.

**Tech Stack:** Next.js 14, React, Wagmi v2, Viem, Coinbase Smart Wallet, EIP-5792.

**Spec:** `docs/superpowers/specs/2026-09-23-gasless-aa-design.md`

## Global Constraints

- Must not break existing traditional wallet connections (MetaMask/Rainbow).
- Must gracefully handle users rejecting the passkey/wallet creation.

---

### Task 1: Environment Variables Setup

**Files:**
- Modify: `.env.example`
- Modify: `.env`

**Interfaces:**
- Produces: `NEXT_PUBLIC_PAYMASTER_URL` environment variable accessible to the frontend.

- [ ] **Step 1: Add to `.env.example`**
Add the following line to the end of the file:
```env
# Coinbase Developer Platform Paymaster URL for Gasless Transactions
NEXT_PUBLIC_PAYMASTER_URL=
```

- [ ] **Step 2: Add to `.env`**
Add the following line to the end of the file (using a placeholder for testing):
```env
# Coinbase Developer Platform Paymaster URL for Gasless Transactions
NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base-sepolia/mock-paymaster-key
```

- [ ] **Step 3: Verify TypeScript Compilation**
Run: `npm run type-check` (or `npx tsc --noEmit`)
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add .env.example .env
git commit -m "chore: add paymaster url to environment variables"
```

---

### Task 2: Configure Wagmi Providers for Smart Wallet

**Files:**
- Modify: `components/Providers.tsx`

**Interfaces:**
- Consumes: Wagmi config and RainbowKit configuration.
- Produces: Wagmi config optimized for Coinbase Smart Wallet and EIP-5792.

- [ ] **Step 1: Update Wagmi Connectors**
Modify `components/Providers.tsx` to include Coinbase Wallet with Smart Wallet preference.
```tsx
import { coinbaseWallet } from 'wagmi/connectors';

// Inside the Wagmi config definition (usually createConfig or getDefaultConfig)
// Ensure the coinbaseWallet connector is configured with preference: 'smartWalletOnly' or 'all'
// If using RainbowKit, configure the walletList to include coinbaseWallet
```
*(Note: If using RainbowKit `getDefaultConfig`, it automatically supports Coinbase Smart Wallet in recent versions. Ensure the configuration enables it.)*

- [ ] **Step 2: Implement Code Modifications**
```tsx
// Example modification for components/Providers.tsx (adjust based on existing setup)
import { coinbaseWallet } from 'wagmi/connectors';

// Update connectors array or RainbowKit configuration to prioritize Coinbase Smart Wallet
// e.g., connectors: [coinbaseWallet({ appName: 'Quick Quiz', preference: 'all' }), ...]
```

- [ ] **Step 3: Verify Build**
Run: `npm run build`
Expected: PASS without Wagmi configuration errors.

- [ ] **Step 4: Commit**
```bash
git add components/Providers.tsx
git commit -m "feat: configure wagmi providers for coinbase smart wallet"
```

---

### Task 3: Refactor Rewards Modal for EIP-5792 Gasless Calls

**Files:**
- Modify: `hooks/use-rewards-modal.ts`
- Modify: `components/modals/RewardsModal.tsx`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_PAYMASTER_URL`.
- Produces: Seamless transaction signing flow using `useWriteContracts` instead of `useWriteContract`.

- [ ] **Step 1: Update Imports in `use-rewards-modal.ts`**
Remove `useWriteContract`. Add `useWriteContracts` from `wagmi/experimental`.
```typescript
import { useWriteContracts } from 'wagmi/experimental';
import { useCapabilities } from 'wagmi/experimental';
```

- [ ] **Step 2: Implement Capabilities Check and Write Logic**
Refactor the `handleClaimTokens` and `handleMintBadge` functions.
```typescript
  const { writeContractsAsync } = useWriteContracts();
  const { data: capabilities } = useCapabilities();
  const chainId = useChainId();
  
  // Inside handleClaimTokens:
  const isPaymasterSupported = capabilities?.[chainId]?.paymasterService?.supported;
  const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_URL;

  const capabilitiesConfig = isPaymasterSupported && paymasterUrl ? {
    paymasterService: {
      url: paymasterUrl
    }
  } : undefined;

  const txId = await writeContractsAsync({
    contracts: [{
      address: QUIZ_TOKEN_ADDRESS,
      abi: QUIZ_TOKEN_ABI,
      functionName: 'claimTokens',
      args: [voucher],
    }],
    capabilities: capabilitiesConfig,
  });
```

- [ ] **Step 3: Update Transaction Receipt Logic**
Wait for the transaction using `useCallsStatus` instead of `useWaitForTransactionReceipt`.
```typescript
import { useCallsStatus } from 'wagmi/experimental';

// Pass txId (call ID) to useCallsStatus to monitor completion.
```

- [ ] **Step 4: Verify TypeScript Compilation**
Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add hooks/use-rewards-modal.ts components/modals/RewardsModal.tsx
git commit -m "feat: implement eip-5792 gasless transactions for rewards"
```
