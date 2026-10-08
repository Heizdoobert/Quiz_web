# Intent: Contracts Dependency Bump

Confirmed 2026-10-08.

- **Outcome:** Dependencies in `contracts/package.json` and its lockfile are updated to the latest versions within their existing semver ranges, plus security fixes if `npm audit` flags any.
- **User:** The team. Maintenance housekeeping, no player-facing change.
- **Why now:** Continuing the dependency cleanup (`drop-unused-deps`, `drop-prisma`).
- **Success:** `npx hardhat compile` and `npx hardhat test` pass in `contracts/`. Compiled ABIs and bytecode are unchanged, or any difference is called out. CI is green on the PR to `preview`.
- **Constraint:** No major version bumps. Solidity sources, deploy scripts, and deployed contracts stay untouched. The PR goes to `preview`, never `main`.
- **Out of scope:** Major bumps (hardhat 3, OpenZeppelin majors), contract logic changes or redeploys, `lib/contracts/` ABIs and addresses in the app, root `package.json` deps, and a `no-console` lint rule.
