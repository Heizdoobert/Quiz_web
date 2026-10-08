# Spec: On-Chain Contest Escrow Smart Contract

## Objective
Enable decentralized, trustless, and Sybil-resistant crypto contests by deploying an on-chain **`ContestEscrow`** smart contract.

Contest creators deposit their chosen `$QUIZ` token reward pool into the escrow contract upfront. Players who complete contests earn EIP-712 signed claim vouchers based on verified quiz performance, which they redeem against the escrow contract. This replaced the earlier paused backend minting (see ADR-007) and completely eliminates unbacked token inflation and creator self-drain exploits.

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
```

---

## Contract Architecture (`ContestEscrow.sol`)

### Storage & Structs
```solidity
struct Contest {
    address creator;
    uint256 totalPool;
    uint256 remainingPool;
    uint256 createdAt;
    uint256 expiresAt;
    bool active;
}

IERC20 public immutable token;
address public authorizedSigner;

// contestId => Contest details
mapping(bytes32 => Contest) public contests;

// contestId => recipient => nonce => used
mapping(bytes32 => mapping(address => mapping(uint256 => bool))) public usedNonces;
```

### Core External Functions

1. **`createContest(bytes32 contestId, uint256 poolAmount, uint256 durationSeconds)`**:
   - Requires `contests[contestId].creator == address(0)` (no duplicate contest IDs).
   - Requires `poolAmount > 0` and `durationSeconds >= 1 days`.
   - Transfers `poolAmount` `$QUIZ` from `msg.sender` to `address(this)` via `SafeERC20.safeTransferFrom`.
   - Sets `contests[contestId]` as active with `expiresAt = block.timestamp + durationSeconds`.
   - Emits `ContestCreated(contestId, msg.sender, poolAmount, expiresAt)`.

2. **`claimReward(bytes32 contestId, address recipient, uint256 amount, uint256 nonce, uint256 deadline, bytes calldata signature)`**:
   - `nonReentrant`.
   - Checks `contests[contestId].active == true`.
   - Checks `block.timestamp <= deadline` and `amount <= contests[contestId].remainingPool`.
   - Checks `!usedNonces[contestId][recipient][nonce]`.
   - Verifies EIP-712 structured data signature against `authorizedSigner`:
     ```solidity
     keccak256("ClaimContestReward(bytes32 contestId,address recipient,uint256 amount,uint256 nonce,uint256 deadline)")
     ```
   - Deducts `contests[contestId].remainingPool -= amount`.
   - Sets `usedNonces[contestId][recipient][nonce] = true`.
   - Transfers `amount` `$QUIZ` to `recipient` via `SafeERC20.safeTransfer`.
   - Emits `ContestRewardClaimed(contestId, recipient, amount, nonce)`.

3. **`refundRemaining(bytes32 contestId)`**:
   - `nonReentrant`.
   - Only callable by `contests[contestId].creator` or contract `owner`.
   - Requires `block.timestamp > contests[contestId].expiresAt`.
   - Requires `contests[contestId].remainingPool > 0`.
   - Deducts all remaining tokens, sets `active = false`, and transfers remaining balance back to `creator`.
   - Emits `ContestRefunded(contestId, creator, amount)`.

4. **`setAuthorizedSigner(address newSigner)`**:
   - Only contract `owner`.

---

## Frontend & Backend Integration

1. **`lib/contracts/ContestEscrowABI.ts` & `addresses.ts`**:
   - Export typed ABI and contract address.
2. **`lib/actions/question-list-actions.ts`**:
   - Unpause `claimListReward(listId, walletAddress)`:
     - Verifies user's SIWE session.
     - Confirms contest attempt is completed in `list_entries`.
     - Calculates earned reward proportion.
     - Issues signed EIP-712 `ClaimContestReward` voucher targeting the `ContestEscrow` contract address.
3. **`components/lists/ContestPlay.tsx`**:
   - Point `useWriteContract` to `ContestEscrow.claimReward` instead of `QuizToken.claimTokens`.
4. **`components/lists/MyListsDashboard.tsx`**:
   - When a creator activates a contest, execute `token.approve` and `contestEscrow.createContest` transaction.

---

## Testing Strategy
1. **Unit & Scenario Tests (`contracts/test/ContestEscrow.test.ts`)**:
   - Create contest transfers tokens from creator to escrow.
   - Successful reward claim transfers tokens to recipient and decreases remaining pool.
   - Duplicate nonce reverts (`"Nonce already used"`).
   - Expired voucher deadline reverts (`"Voucher expired"`).
   - Invalid signature / wrong signer reverts.
   - Cannot claim more than remaining pool.
   - Creator cannot refund before `expiresAt`.
   - Creator can refund unclaimed balance after `expiresAt`.
2. **Integration Tests (`tests/answer-and-list-guards.test.ts`)**:
   - Server action `claimListReward` returns valid voucher structure with expected domain and contract address.
3. **Regression Tests**:
   - Existing 16 Hardhat tests pass.
   - Next.js test suite (29 tests) passes.

---

## Success Criteria
- [ ] `ContestEscrow.sol` compiles with zero warnings under Solidity 0.8.24.
- [ ] 100% test pass rate across new and existing Hardhat tests.
- [ ] ABI and contract definitions synchronized into frontend `lib/contracts/`.
- [x] `claimListReward` server action unpaused and producing valid EIP-712 vouchers.
- [ ] Next.js type check, lint, and build all pass cleanly.
