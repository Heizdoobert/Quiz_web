# Files that stay in `preview` and local only

Checked 2026-10-08, and again 2026-10-09, against `origin/main` and `company/update-code`. Nothing here is removed from `preview` or from anyone's checkout. This list is for the `preview` to `main` promotion: these paths should not be part of what production tracks.

The production **image** already excludes them: the runtime stage of the `Dockerfile` copies only `.next/standalone`, `public` and `.next/static`, and `.dockerignore` drops `tasks`, `docs`, `tests`, `scripts`, `contracts`, `.github` and every `*.md` except `README.md`. The question below is only about what `main` tracks in git.

## Leave out of `main`

| Path | What it is | Tracked on `main` (2026-10-09) | Tracked on `company/update-code` |
|---|---|---|---|
| `tasks/` | Agent task plans and todo lists | none | 20 files |
| `coco/` | CocoIndex code-index project and its generated `out/` markdown | none | 261 files |
| `AGENTS.md`, `AGENT_MAP.md`, `CAPABILITY-MAP.md` | Instructions and maps for AI agents | none | 3 files |
| `skills-lock.json` | Lock file for agent skills | none | 1 file |
| `docs/superpowers/` | Agent plans and specs | none | 17 files |
| `docs/specs/`, `docs/intent/` | Feature specs and intent notes written for agent-driven work | none | 20 files |
| `project-improvements.md`, `SPEC-realtime-leaderboard.md` | Planning notes | none | 2 files |
| `design-system/` | Design reference output; nothing in `app/`, `components/`, `lib/` or `hooks/` imports it | none | 1 file |
| `e2e/`, `playwright.config.ts` | Playwright specs; not run by CI (`ci.yml` has no e2e job) | none | 2 files |
| `.claude/`, `.agents/`, `.superpowers/`, `CLAUDE.md` | Agent tool folders and notes; already ignored or untracked, listed so they stay that way | none | none |

## Decide before excluding

| Path | Why it is not obvious |
|---|---|
| `.github/workflows/opencode.yml` | An AI bot that reacts to `/oc` comments and uses `OPENCODE_API_KEY`. GitHub runs `issue_comment` workflows from the **default branch**, so removing it from `main` switches the bot off entirely. Keeping it on `main` puts an AI workflow with a secret on the production repo. |
| `CONSTRAINTS.md` | The quality bar read by agents and mirrored by the `check:*` scripts (CI runs the scripts, not the file). `AGENTS.md` points at it. Human-useful, not needed to run production. |
| `SECURITY-TRADE-OFFS.md`, `docs/decisions/` | Security posture and ADRs. Useful documentation, not agent-only. Your call. |
| `PRODUCTION_COMMERCIALIZATION_GUIDE.md`, `CHANGELOG.md` | Human documents. Normally kept. |

## Keep on `main` (CI, deploy or ops need them)

`.github/` except `opencode.yml`, `app/`, `components/`, `hooks/`, `lib/`, `public/`, `supabase/` (migrations), `contracts/` (CI builds and tests it), `tests/` (CI runs them), `Dockerfile`, `docker-compose.yml`, package and config files, `.dependency-cruiser.cjs`, `.gitleaksignore`.

## State of `main`

The one-time removal was done in commit `5221f49` ("keep dev-only and AI-use files out of production") and promoted, so `origin/main` tracks none of the paths in the first table. The procedure below is what to repeat on each promotion: a `preview` that still tracks these files will bring them back on the next merge unless step 2 runs.

## Promotion procedure (for the next promotion)

Removing the files with a one-time commit on `main` is not enough: the next `preview` to `main` merge hits a modify/delete conflict whenever `preview` edits one of them. Do it as part of every promotion instead, on a throwaway branch or in a PR from `preview`, never by pushing to `main`:

1. Merge `preview` into the promotion branch.
2. Remove the paths in the first table: `git rm -r --ignore-unmatch tasks coco AGENTS.md AGENT_MAP.md CAPABILITY-MAP.md skills-lock.json docs/superpowers docs/specs docs/intent project-improvements.md SPEC-realtime-leaderboard.md design-system e2e playwright.config.ts`. For modify/delete conflicts, keep the deletion.
3. Run `npm run check:task` and `npm run check:deps`, and confirm CI is green on `preview` first, as `AGENTS.md` requires.
4. Merge to `main` only after review.

If this becomes routine, turn step 2 into a small script under `scripts/` (already outside the image). It is not written yet because the list may change after you decide the "Decide" rows.

