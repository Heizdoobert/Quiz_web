# Agent Guidelines & Rules

1. Read CONSTRAINTS.md before writing code. Do not weaken it to make a change pass.
2. **Branching & Deployment Workflow**:
   - All changes must be merged to the `preview` branch first.
   - Never push directly to `main` (production).
   - Check GitHub Actions CI/CD on `preview` first; all checks must be green before deploying to production.
   - Only after all CI/CD checks pass on `preview`, merge `preview` into `main` (production).
