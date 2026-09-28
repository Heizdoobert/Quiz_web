# Intent: Quiz Load Speed

Confirmed 2026-09-28.

- **Outcome:** Find out whether players on the deployed site wait too long for questions and the leaderboard, and fix it only if they do.
- **User:** Players on the live `main` site (`preview` used as the proxy).
- **Why now:** The local dev log showed `fetchRandomQuestion()` at ~14.5s and `getGlobalLeaderboard(50)` at ~7.3s; the deployed site has never been timed.
- **Success:** On the deployed site, the first question shows in ≤2s and the leaderboard in ≤3s — either measured as already within target, or fixed until it is.
- **Constraint:** Measure the deployed site before changing any code. Changes to Supabase queries or indexes are allowed if the fix needs them.
- **Out of scope:** New features, UI changes, and speeding up the local `next dev` compile. If the deployed site already meets the targets, nothing changes.

## Measurement (2026-09-28)

Deployed `preview` (`quiz-ixn25dcye-dut1.vercel.app`), headless Chromium, 5 rounds, via Vercel protection bypass.

| What | Measured | Target | Verdict |
| --- | --- | --- | --- |
| First question card visible | 0.38–0.96s | ≤2s | Pass |
| `getGlobalLeaderboard(50)` server action | 0.47–1.04s | ≤3s | Pass |
| `fetchRandomQuestion` server action (next question) | 0.50–0.95s | ≤2s | Pass |
| `submitAnswer` server action | 0.48–0.94s | — | — |

The home page is prerendered at build time (`x-nextjs-prerender: 1`, served from Vercel cache in ~0.15s), so no Supabase call happens on the first page load. The ~14.5s seen locally was the `next dev` environment, not production.

**Decision:** Targets met. No code change.

### Risks noted, not acted on

- `getGlobalLeaderboard` fetches every `quiz_results` row and aggregates in JS. Supabase caps a response at 1000 rows by default, so once there are more results the leaderboard silently counts only a subset. Time also grows with the table.
- Next.js runs server actions one at a time per client. After an answer, the leaderboard refresh runs before a "Next Question" fetch, so the effective next-question wait is roughly the sum of both (~1–2s today).
- The prerendered page gives every visitor the same first question, and its leaderboard is frozen at build time (it was empty, so the client refetches on load).
