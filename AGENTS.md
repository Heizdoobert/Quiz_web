# Agent Guidelines & Rules

1. Read CONSTRAINTS.md before writing code. Do not weaken it to make a change pass.
2. **Branching & Deployment Workflow**:
   - All changes must be merged to the `preview` branch first.
   - Never push directly to `main` (production).
   - Check GitHub Actions CI/CD on `preview` first; all checks must be green before deploying to production.
   - Only after all CI/CD checks pass on `preview`, merge `preview` into `main` (production).
3. **Web3 Knowledge Requirement**:
   - All agents MUST load and read the `web3-fundamentals` skill (`.agents/skills/web3-fundamentals/SKILL.md`) when handling Web3-related tasks, including smart contracts, frontend dApps (React/Viem/Ethers), data analysis (Dune), tokenomics, or community/marketing features.
