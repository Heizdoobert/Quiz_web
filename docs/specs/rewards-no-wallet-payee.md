# Spec: Who Receives $QUIZ for Accounts Without a Wallet

Module: `rewards` (consumes `identity`, `lists`) — see `CAPABILITY-MAP.md`.
Status: Draft, awaiting approval. Depends on `docs/specs/identity-accounts.md` (`users.id`, `wallet_linked_at`, wallet cannot be changed once linked).

## Objective
Players choose whether to add a wallet:
- **With a wallet**, they claim the $QUIZ they earn, as today.
- **Without a wallet**, the $QUIZ they earn goes to the operator's treasury wallet.

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
**Payee rule, per recorded correct answer.** The account's wallet receives the reward if the account had a wallet when it answered (`wallet_linked_at IS NOT NULL AND answered_at >= wallet_linked_at`); otherwise the treasury does.
- Because a wallet cannot be unlinked or changed (identity spec), the rule is computed from `quiz_results` and never stored.
- Answers from before a wallet was added stay with the treasury; they do not move to the player later (see Open Questions).

**Treasury.**
- New server-only env var `TREASURY_WALLET_ADDRESS`. If it is unset, no treasury earnings are claimable and the server logs an error at claim time.
- The treasury is an ordinary account: the operator signs in with that wallet via SIWE and claims in the existing `RewardsModal`.
- For that account, `getClaimableRewards` adds the treasury pool: 10 × correct answers answered without a wallet across all accounts, minus the treasury's claimed `reward_claims`. No new admin screen or script.

**SQL** (new script `lib/sql/reward-payee.sql`):
- `get_wallet_earned_count(p_user_id UUID)`: correct answers under the rule above.
- `get_treasury_earned_count()`: correct answers from accounts with no wallet at `answered_at`.
- Both are SECURITY DEFINER, callable only with the secret key (execute revoked from `anon`).
- `get_user_stats` and leaderboards are unchanged: score counts every correct answer, wallet or not.

**Server actions** (`lib/actions/reward-actions.ts`):
- `getClaimableRewards()` and `generateTokenVoucher()` take no address. They use `getSessionAccount()`:
  - no account: nothing
  - an account without a wallet: `{ claimableTokens: '0', payee: 'treasury', treasuryEarned }` so the UI can show what went to the treasury
  - an account with a wallet: the wallet-earned amount minus claimed, and the voucher recipient is always `account.wallet`
- Badges need a wallet to claim. Eligibility still uses all-time stats, so badges earned before adding a wallet can be claimed after.
- Contests: `startContest` returns `WALLET_REQUIRED` for an account without a wallet, because contest pools are funded by the list creator, not the operator.

**Disclosure** (same text everywhere):
> Without a wallet, the $QUIZ you earn goes to the Quick Quiz treasury, not to you. Add a wallet any time to keep what you earn from then on.

It is shown:
- in the sign-in modal's email step, before the code is sent (the button reads "Continue without wallet")
- in `RewardsModal` and the header menu for accounts without a wallet, next to "Add wallet"
- on the contest join button as "Add a wallet to join contests"

## Project Structure
- `lib/actions/reward-actions.ts`, `lib/actions/question-list-actions.ts` (`startContest` wallet check)
- `lib/sql/reward-payee.sql`
- `components/modals/RewardsModal.tsx`, `components/auth/SignInModal.tsx`, `components/layout/Header.tsx`
- `lib/rewards-copy.ts` — the disclosure string, one source for every screen
- `tests/rewards-payee.test.ts`

## Code Style
The recipient comes from the session account, never from arguments:
```ts
export async function generateTokenVoucher(): Promise<VoucherResult> {
  const account = await getSessionAccount();
  if (!account) return { success: false, code: 'UNAUTHORIZED' };
  if (!account.wallet) return { success: false, code: 'WALLET_REQUIRED' };
  const claimable = await claimableFor(account); // includes the treasury pool when account.wallet === TREASURY
  // sign EIP-712 ClaimTokens { recipient: account.wallet, amount: claimable, ... }
}
```

## Testing Strategy
- Vitest with the session, `supabaseAdmin.rpc` and the signer mocked:
  - an account without a wallet gets 0 claimable and no voucher
  - an account that linked a wallet mid-way claims only answers from after `wallet_linked_at`
  - the treasury account's claimable is its own plus the no-wallet pool minus its claims
  - an unset `TREASURY_WALLET_ADDRESS` gives the treasury pool 0
  - `startContest` without a wallet returns `WALLET_REQUIRED`
  - a voucher recipient is always `account.wallet`
- SQL, checked manually on a copy of the database: the wallet and treasury counts for all accounts add up to the total correct answers.
- Testing Library: the disclosure text appears in the email step, in `RewardsModal`, and in the header for accounts without a wallet.

## Boundaries
- **Always:** show the disclosure before an account without a wallet can record its first answer; take the recipient from the session; keep one source for the disclosure text.
- **Ask first:** changing the payee rule (e.g. paying past earnings after a wallet is linked); changing the reward rate; changing contracts; running `reward-payee.sql` on a shared database; setting `TREASURY_WALLET_ADDRESS` in production.
- **Never:** send tokens for an account without a wallet to anyone but the treasury; hide or shorten the disclosure; send a contest pool share to the treasury; accept a recipient address from the client.

## Success Criteria
1. An account without a wallet sees the disclosure before its first saved answer, and its claimable $QUIZ is always 0.
2. After adding a wallet, the player can claim 10 QUIZ for each correct answer made after adding it, and none for answers before.
3. Signed in with the treasury wallet, the operator's `RewardsModal` shows and claims the pool from answers made without a wallet; claiming twice never mints more than was earned.
4. Wallet counts plus treasury counts equal all correct answers.
5. An account without a wallet cannot join a contest and is told to add a wallet.
6. `npm run check:task`, contract tests and `npm run build` pass; changed-line coverage ≥ 80%.

## Open Questions
- When a player adds a wallet, should the $QUIZ they earned before that go to them (the fairer option, since the treasury has not claimed it yet) or stay with the treasury, as specified?
- Keeping players' earnings needs clear terms. Should the disclosure link to a Terms page, and has it been checked for the countries where you operate?
- Which wallet is the treasury?
