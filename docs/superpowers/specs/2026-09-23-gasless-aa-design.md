# Gasless Transactions (Account Abstraction) Design Spec

## Goal
Enable players to claim `$QUIZ` tokens and mint `QBADGE` NFTs on Base Sepolia completely free of gas fees using Account Abstraction (AA) and a Paymaster.

## Tech Stack
- **Coinbase Smart Wallet**: Native AA wallet that integrates perfectly with Wagmi v2.
- **EIP-5792 (Wallet Call API)**: To send sponsored transactions via the `writeContracts` capability.
- **Coinbase Developer Platform (CDP) Paymaster**: To sponsor gas fees for users on Base networks.

## Architecture

1. **Wallet Connection (Wagmi Configuration)**
   - Update the Wagmi/RainbowKit configuration to prioritize and support Coinbase Smart Wallet.
   - Smart Wallet allows creating a wallet instantly via Passkeys (FaceID/TouchID) without seed phrases, drastically lowering the barrier to entry for non-crypto natives.

2. **Transaction Execution (EIP-5792)**
   - Currently, `hooks/use-rewards-modal.ts` uses standard `useWriteContract` which triggers traditional Ethereum transactions (user pays gas).
   - We will update the claiming logic to use Wagmi's `useWriteContracts` (from `wagmi/experimental`).
   - We will configure the `capabilities` parameter to route the transaction through a Paymaster.

3. **Paymaster Configuration**
   - We will require a `NEXT_PUBLIC_PAYMASTER_URL` environment variable (obtained from Coinbase Developer Platform).
   - The transaction will request sponsorship from this Paymaster URL.

4. **Fallback Mechanism**
   - If the user connects with a traditional EOA wallet (like MetaMask) that doesn't support EIP-5792 sponsored calls, the UI will gracefully fall back to standard transactions where the user pays their own gas.

## Changed Files
- `hooks/use-rewards-modal.ts` - Refactor to support `useCapabilities` and `useWriteContracts`.
- `components/Providers.tsx` or Wagmi config - Ensure Coinbase Wallet connector is configured properly.
- `.env.example` & `.env` - Add `NEXT_PUBLIC_PAYMASTER_URL`.

## Global Constraints
- Must not break existing traditional wallet connections (MetaMask/Rainbow).
- Must gracefully handle users rejecting the passkey/wallet creation.
