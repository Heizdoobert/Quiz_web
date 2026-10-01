# Quick Quiz Ecosystem — V1 Intent

> Confirmed: 2026-10-01 by @alexheiz

## Outcome

Turn Quick Quiz from a standalone quiz app into a live, token-powered ecosystem where creators fund quiz contests with `$QUIZ` tokens via on-chain escrow, players compete and claim real rewards on-chain, and the whole loop works end-to-end on a live chain — proving "this is real" to sponsors, communities, and early adopters.

## Users

Three roles in a flywheel:

- **Creators** — make quizzes, fund contests with `$QUIZ` tokens
- **Players** — compete, earn tokens by claiming on-chain rewards
- **Sponsors/Brands** (v2) — fund reward pools for community reach

V1 focuses on **creators and players** only.

## Why Now

- `ContestEscrow.sol` is built, tested, and passing CI
- App has SIWE auth, profiles, leaderboards, quiz functionality
- CI/CD pipeline is green and formalized (preview → main)
- Codebase is clean — the missing piece is connecting these into a working live product

## Success Criteria

A live demo where:

1. A creator creates a quiz contest
2. The creator funds it with `$QUIZ` tokens via the escrow contract
3. A player takes the quiz and scores well
4. The player claims their reward on-chain
5. **Tokens actually move on a live chain**

That single end-to-end flow, working on a live chain (not testnet), is v1 shipped.

## Constraints

- Solo builder + AI agents as the engineering team
- No existing community or team yet
- Speed to a working demo matters more than perfection
- All changes follow the preview-first → CI/CD green → merge to main workflow

## Out of Scope (V1)

- Third-party APIs
- Mobile app
- Sponsor analytics dashboards
- NFT-based reputation system
- Creator revenue sharing
- Advanced tokenomics

These are v2+.

## Operational Rule

Maintain a persistent **task log** updated after every completed task so the owner can audit and verify real work done. Log location: `docs/intent/ecosystem-v1-log.md`
