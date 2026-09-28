# Spec: Who Receives $QUIZ for Accounts Without a Wallet

Module: `rewards` (consumes `identity`, `lists`) — see `CAPABILITY-MAP.md`.
Status: Approved 2026-09-28 (old coins go to the player once a wallet is added). Depends on `docs/specs/identity-accounts.md` (`users.id`, `wallet_linked_at`, wallet cannot be changed once linked).

## Objective
Players choose whether to add a wallet.
- The $QUIZ an account earns belongs to that account.
- When the player adds a wallet, they can claim everything they earned, including from before they added it.
- If an account still has no wallet 180 days after earning, those coins go to the operator's treasury wallet.

Players are told this plainly before they choose, and on every rewards screen.

Out of scope: moving tokens that were already minted, on-chain transfers per answer, changing the 10 QUIZ per correct answer rate, changing contracts.

## Tech Stack
Next.js 16.3 server actions, viem 2 EIP-712 vouchers signed by `REWARD_SIGNER_PRIVATE_KEY` (`lib/chain.ts`), existing `QuizToken.claimTokens` (mints to the voucher's recipient), Supabase Postgres, Vitest 5.

## Commands
- Fast gate: `npm run check:fast`
- Task gate: `npm run check:task`
- Focused test: `npx vitest run tests/rewards-payee.test.ts`
- Contract tests (unchanged, should still pass): `cd contracts && npx hardhat test`
- Build: `npm run build`

## Design
**Payee rule.** Each recorded correct answer earns 10 QUIZ for its account.
- An account's claimable amount = 10 × (its correct answers − `users.treasury_swept_count`) − what the account has already claimed.
- It is claimable only once the account has a wallet. The voucher recipient is always the account's wallet.

**Treasury sweep.** The treasury receives the rewards for correct answers that:
- were answered more than 180 days ago (`TREASURY_GRACE_DAYS`, fixed at 180), and
- belong to an account that still has no wallet at sweep time.

The sweep is one SQL function, `sweep_to_treasury()`:
- In one transaction, for each account without a wallet, it sets `treasury_swept_count` to that account's count of correct answers older than the grace period. This only ever grows, because the cutoff only moves forward.
- It returns nothing to the caller. Its effect is visible as a larger treasury entitlement.
- An account that adds a wallet after a sweep keeps everything not yet swept.
- Treasury entitlement = 10 × Σ `treasury_swept_count`; treasury claimable = entitlement − the treasury account's claims.

**Treasury account.**
- New server-only env var `TREASURY_WALLET_ADDRESS`. If it is unset, sweeps do not run and the treasury pool is 0.
- The treasury is an ordinary account: the operator signs in with that wallet via SIWE and opens the existing `RewardsModal`.
- For that account, `getClaimableRewards` first calls `sweep_to_treasury()`, then adds the treasury claimable to the account's own. No new admin screen or script.

**SQL** (new script `lib/sql/reward-payee.sql`):
- `users.treasury_swept_count INT NOT NULL DEFAULT 0`
- `sweep_to_treasury()` and `get_treasury_entitled_count()`: SECURITY DEFINER, execute revoked from `anon` (secret key only)
- `get_user_stats` and leaderboards are unchanged: score counts every correct answer, wallet or not.

**Server actions** (`lib/actions/reward-actions.ts`):
- `getClaimableRewards()` and `generateTokenVoucher()` take no address and use `getSessionAccount()`:
  - no account: nothing
  - an account without a wallet: `{ claimableTokens: '0', heldTokens, sweepsAt }` so the UI shows what is waiting and when the oldest part would go to the treasury
  - an account with a wallet: its claimable amount above, plus the treasury pool when `account.wallet === TREASURY_WALLET_ADDRESS`
- Badges need a wallet to claim. Eligibility uses all-time stats, so badges earned before adding a wallet can be claimed after.
- Contests: `startContest` returns `WALLET_REQUIRED` for an account without a wallet, because contest pools are funded by the list creator, not the operator.

**Disclosure** (same text everywhere, from `lib/rewards-copy.ts`):
> You can play without a wallet. The $QUIZ you earn is kept for you: add a wallet any time to claim it. If you haven't added a wallet within 180 days of earning it, that $QUIZ goes to the Quick Quiz treasury.

It is shown:
- in the sign-in modal's email step, before the code is sent (the button reads "Continue without wallet")
- in `RewardsModal` and the header menu for accounts without a wallet, next to "Add wallet" and the held amount
- on the contest join button as "Add a wallet to join contests"

## Project Structure
- `lib/actions/reward-actions.ts`, `lib/actions/question-list-actions.ts` (`startContest` wallet check)
- `lib/sql/reward-payee.sql`
- `components/modals/RewardsModal.tsx`, `components/auth/SignInModal.tsx`, `components/layout/Header.tsx`
- `lib/rewards-copy.ts`
- `tests/rewards-payee.test.ts`

## Code Style
The recipient comes from the session account, never from arguments:
```ts
export async function generateTokenVoucher(): Promise<VoucherResult> {
  const account = await getSessionAccount();
  if (!account) return { success: false, code: 'UNAUTHORIZED' };
  if (!account.wallet) return { success: false, code: 'WALLET_REQUIRED' };
  const claimable = await claimableFor(account); // adds the treasury pool when account.wallet === TREASURY
  // sign EIP-712 ClaimTokens { recipient: account.wallet, amount: claimable, ... }
}
```

## Testing Strategy
- Vitest with the session, `supabaseAdmin.rpc` and the signer mocked:
  - an account without a wallet gets 0 claimable, no voucher, and correct `heldTokens`
  - an account that adds a wallet claims all its earnings minus `treasury_swept_count`
  - the treasury account's claimable is its own plus the treasury pool minus its claims
  - an unset `TREASURY_WALLET_ADDRESS` gives the pool 0 and runs no sweep
  - `startContest` without a wallet returns `WALLET_REQUIRED`
  - a voucher recipient is always `account.wallet`
- SQL, checked manually on a copy of the database:
  - a sweep never takes answers younger than 180 days or from accounts with a wallet
  - running the sweep twice changes nothing
  - Σ player claimable + claimed + treasury entitlement = 10 × all correct answers
- Testing Library: the disclosure text appears in the email step, in `RewardsModal` and in the header for accounts without a wallet.

## Boundaries
- **Always:** show the disclosure before an account without a wallet records its first answer; take the recipient from the session; keep one source for the disclosure text; run the sweep in one transaction.
- **Ask first:** changing the 180-day grace period or the reward rate; changing contracts; running `reward-payee.sql` on a shared database; setting `TREASURY_WALLET_ADDRESS` in production.
- **Never:** sweep answers younger than the grace period or from an account with a wallet; lower `treasury_swept_count`; hide or shorten the disclosure; send a contest pool share to the treasury; accept a recipient address from the client.

## Success Criteria
1. An account without a wallet sees the disclosure before its first saved answer, sees its held $QUIZ, and cannot claim.
2. After adding a wallet, the player can claim 10 QUIZ for every correct answer they made, before or after adding it, minus anything swept to the treasury.
3. Signed in with the treasury wallet, the operator's `RewardsModal` sweeps and shows the pool from answers over 180 days old on accounts that still have no wallet. Claiming never mints more than was swept.
4. Player claimable + claimed + treasury entitlement always equals 10 × all correct answers.
5. An account without a wallet cannot join a contest and is told to add a wallet.
6. `npm run check:task`, contract tests and `npm run build` pass; changed-line coverage ≥ 80%.

## Open Questions
- Which wallet is the treasury?
- The disclosure describes a forfeiture after 180 days. Should it link to a Terms page, and has that been checked for the countries where you operate?
