# docs/specs/contracts-dep-bump.md
lines:83 exports:
---
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
