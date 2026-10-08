# Spec: Contracts Dependency Bump

Intent: `docs/intent/contracts-dep-bump.md` (confirmed 2026-10-08). Status: Implemented 2026-10-08, pending CI on the PR to `preview`.

## Objective
Update the dependencies of `contracts/` to the newest versions that stay inside their current semver ranges, and apply in-range security fixes. No contract behavior changes.

Baseline (2026-10-08, from `contracts/package-lock.json` on `origin/preview`):

| Package | Locked | In-range newest | Latest (major, out of scope) |
| --- | --- | --- | --- |
| `dotenv` | 18.0.4 | 18.0.6 | 18.0.6 |
| `hardhat` | 2.29.1 | 2.29.1 | 3.18.1 |
| `@nomicfoundation/hardhat-toolbox` | 5.0.0 | 5.0.0 | 7.0.0 |
| `typescript` | 5.9.3 | 5.9.3 | 7.0.2 |
| `@openzeppelin/contracts` | 5.x | already newest 5.x | not listed as outdated |

`npm audit` baseline: 55 vulnerabilities (19 low, 12 moderate, 24 high). All are transitive. Examples: `ws` 8.0.0–8.20.1 (high, `npm audit fix` available), `uuid` and `solc`→`tmp` (fix needs `--force`, hardhat 3, out of scope).

## Tech Stack
Hardhat 2.x, `@nomicfoundation/hardhat-toolbox` 5, OpenZeppelin Contracts 5.x, Solidity 0.8.24 (evm target cancun), ethers v6, TypeScript 5.9, Node 24 / npm 12.

## Commands
Run from `contracts/` (or the scratch copy, see Boundaries):
- Install: `npm ci --no-audit --no-fund`
- Update in range: `npm update <pkg...>` for the specific packages `npm outdated` and a dry-run diff show moving forward. Do not run a bare `npm update` or `npm audit fix`: both re-resolve `eth-gas-reporter` (an optional peer of hardhat-toolbox) from 0.2.27 down to 0.2.25, which re-adds the `request`, `underscore`, `elliptic` and old `ethers` 4 chain and takes the audit from 55 to 58 vulnerabilities with 8 critical.
- Compile: `npx hardhat compile`
- Test: `npx hardhat test`
- Outdated check: `npm outdated`
- CI job: `Smart Contract Tests (Hardhat)` in `.github/workflows/ci.yml` (runs `npx hardhat test` with `contracts/package-lock.json` as the cache key)

## Project Structure
Changed files only:
- `contracts/package.json`: range floors may move only if `npm update` raises them; no range may widen to a new major.
- `contracts/package-lock.json`: the real change.
- `docs/intent/contracts-dep-bump.md`, `docs/specs/contracts-dep-bump.md`: this work.

Untouched: `contracts/contracts/*.sol`, `contracts/scripts/`, `contracts/test/`, `contracts/hardhat.config.ts`, root `package.json`, `lib/contracts/`, `.github/`.

## Code Style
No source code changes. Commit message follows repo style: `chore(contracts): bump deps within semver ranges`.

## Testing Strategy
No new tests. The existing suite is the guard: 38 tests across `ContestEscrow`, `QuizBadgeNFT`, `QuizToken`.

Equivalence check for "no behavior change": hash each contract's ABI and creation bytecode from `artifacts/` before and after, with the same compiler (0.8.24, cancun).

Baseline hashes (first 12 hex of sha256):

| Contract | ABI | Bytecode |
| --- | --- | --- |
| `ContestEscrow` | `2cfa3ab5bb09` | `778feff66a2a` |
| `QuizBadgeNFT` | `c396800d703d` | `fdfbe9e9990c` |
| `QuizToken` | `5ebf176d5e13` | `ca56abeab93c` |

Baseline: `hardhat compile` passes (39 Solidity files), `hardhat test` passes (38 tests).

## Boundaries
- Always: run compile, test, and the hash check after the bump; keep lockfile changes in the same commit as the `package.json` change; open the PR against `preview`.
- Ask first: any change to `contracts/*.sol`, the Solidity compiler version, or CI config; accepting an ABI or bytecode hash change (see below).
- Never: `npm audit fix --force`; a major bump; pushing to `main`; touching deployed addresses or `lib/contracts/`.

Environment note: the repo lives on an NTFS drive mounted with `ntfs-3g`, where `npm ci` (thousands of small files) and `rm -rf node_modules` did not finish in 5+ minutes. Install, compile, and test in a scratch copy on the home filesystem (ext4), then copy `package.json` and `package-lock.json` back. `npm ci` there takes about 3s. npm 12 blocks install scripts for `keccak` and `secp256k1` (they fall back to pure JS); this does not affect compile or test.

## Success Criteria
1. `npm outdated` shows nothing left in range (only the major-version rows above remain).
2. `npx hardhat compile` succeeds and `npx hardhat test` shows 38 passing.
3. ABI hashes are unchanged. Bytecode hashes are unchanged, or, if a bump changes them (compiler metadata hash can shift if the `solc` build or OpenZeppelin sources change), the PR states which contract and why, and you approve it before merge. Deployed contracts are never affected, since nothing is redeployed.
4. `npm audit` count does not increase; advisories fixable inside the ranges without worsening the tree are gone.
5. CI is green on the PR to `preview`.

## Result (2026-10-08)
Lockfile only (`package.json` unchanged, `^18.0.4` already admits `dotenv` 18.0.6):
`dotenv` 18.0.4 → 18.0.6, `@types/node` 26.6.3 → 26.6.4, `acorn` 8.18.0 → 8.19.0, `follow-redirects` 1.16.0 → 1.16.1, `handlebars` 4.7.9 → 4.7.10, `ansi-regex` (under `@isaacs/cliui`) 6.3.0 → 6.4.0.

- Compile: 39 files OK. Tests: 38 passing.
- ABI and bytecode hashes: identical to baseline for all three contracts.
- `npm audit`: 55 (19 low, 12 moderate, 24 high), unchanged. The `ws` high advisory is not fixed: `@ethersproject/providers` 5.8.0 pins `ws` to exactly `8.18.0`, so no in-range bump reaches it. `npm audit fix` only "clears" it by downgrading `eth-gas-reporter` (see Commands), which is worse overall. Fixing it needs an upstream change or a hardhat major, so success criterion 4's "`ws` is gone" is not met; "count does not increase" is.
- `npm outdated`: only `hardhat` 3, `hardhat-toolbox` 7, `typescript` 7 remain (majors, out of scope).

## Open Questions
1. Is the `allowScripts` warning for `keccak` and `secp256k1` worth addressing in a follow-up? (Default: no, pure JS fallback is fine.)
2. Should a follow-up pin `eth-gas-reporter` so a bare `npm update` or `npm audit fix` cannot downgrade it? (Default: no, out of this scope.)
