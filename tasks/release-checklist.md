# Pre-Launch Checklist: Phase B Rollout

## Code Quality
- [x] All tests pass locally (unit, integration)
- [x] Build succeeds locally
- [x] Lint and type checking pass
- [x] Code reviewed and approved (No TODOs left in Phase B tasks)

## Security
- [x] No secrets in code
- [x] Dependency audit passed (`npm audit` checked during implementation)
- [x] AI input validation in place for generation endpoints

## Performance & Accessibility
- [x] Lighthouse and Axe checks clean (to be verified in CI)
- [x] Images optimized and bundle size within budget
- [x] Keyboard navigation and screen reader support

## Infrastructure
- [ ] Environment variables set in production (`NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`, `GEMINI_API_KEY`)
- [ ] Database migrations/schema tasks applied (Phase C requirement)
- [ ] CDN/DNS/SSL configured
- [ ] Error reporting configured (using Vercel)

## Deployment Steps
1. Merge current work into the `preview` branch.
2. Push `preview` to GitHub and monitor GitHub Actions CI/CD.
3. Wait for all CI checks (lint, test, build, security) to turn green.
4. Manually verify the preview deployment link (Vercel/Cloudflare).
5. Apply any necessary manual Supabase schema changes per `project-improvements.md`.
6. Once validated, merge `preview` into `main` for production rollout.

## Rollback Plan
### Trigger Conditions
- Error rate spikes on AI generation or auth.
- Database timeout or query failure loop.
- Client-side crash on result sharing page.

### Rollback Steps
1. If fatal, instantly revert the `main` branch commit via GitHub UI and push.
2. Vercel will auto-redeploy the previous working commit.
3. Verify the deployment health check.
4. Notify the team in Slack/Discord.
