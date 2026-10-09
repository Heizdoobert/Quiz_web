# AGENTS.md
lines:22 exports:
---
# Agent Guidelines & Rules

1. Read CONSTRAINTS.md before writing code. Do not weaken it to make a change pass.
2. **Branching & Deployment Workflow**:
   - All changes must be merged to the `preview` branch first.
   - Never push directly to `main` (production).
   - Check GitHub Actions CI/CD on `preview` first; all checks must be green before deploying to production.
   - Only after all CI/CD checks pass on `preview`, merge `preview` into `main` (production).
3. **Web3 Knowledge Requirement**:
   - All agents MUST load and read the `web3-fundamentals` skill (`.agents/skills/web3-fundamentals/SKILL.md`) when handling Web3-related tasks, including smart contracts, frontend dApps (React/Viem/Ethers), data analysis (Dune), tokenomics, or community/marketing features.
4. **Codebase Exploration & Searching**:
   - All agents MUST use the static codebase index located in `coco/out/` when searching, exploring, reading, or analyzing the project codebase for coding tasks. Use this index to quickly locate files, exports, and code snippets before navigating the raw source files directly.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
