# Spec: CocoIndex Pipeline Update & Synchronization

## Objective
Update and synchronize the CocoIndex (`AgentIndex`) project for `web_quiz` so that:
1. The broken local Python virtual environment (`coco/.venv`) is properly provisioned with `cocoindex >= 1.0.0` (using `uv`).
2. `coco/main.py` accurately covers the current project topology:
   - Include newly added and restructured directories in `SOURCE_DIRS`: `packages`, `server`, `ai`, `tasks`, and `migrations`.
   - Prune obsolete paths that no longer exist (e.g., `contracts/*`).
   - Include `**/*.dart` in `PatternFilePathMatcher` to index Flutter/Dart mobile app and SDK code (`mobile/`, `packages/auth_sdk/`).
   - Add compiler cache and build output exclusions to `excluded_patterns` (`**/.dart_tool/**`, `**/build/**`, `**/.turbo/**`, `**/.gradle/**`, `**/.idea/**`, `**/.vscode/**`) to prevent cluttering `coco/out/`.
3. Add a convenient script `"index:coco"` in `package.json` to allow one-command index updates.
4. Run `cocoindex update coco/main.py` to regenerate and sync the clean index snippets in `coco/out/`.

## Tech Stack
- Python 3.11
- CocoIndex `>= 1.0.0` (installed `1.0.25`)
- uv package & environment manager
- Node.js 20+ & npm

## Commands
- **Environment Setup:** `rm -rf coco/.venv && /home/agent/.hermes/bin/uv venv coco/.venv --python 3.11 && cd coco && /home/agent/.hermes/bin/uv sync`
- **Run Indexer:** `coco/.venv/bin/cocoindex update coco/main.py`
- **NPM Shortcut:** `npm run index:coco`
- **Type Check & Lint:** `npm run type-check`

## Project Structure
```
coco/
├── main.py          # CocoIndex App definition, source directories, matchers, file processor
├── pyproject.toml   # Python project definition with cocoindex dependency
├── uv.lock          # Locked Python dependencies
├── .venv/           # Local virtualenv (gitignored)
├── cocoindex.db*    # SQLite local state database (gitignored)
└── out/             # Extracted file headers and snippet markdown files
package.json         # Workspace manifest with convenience script
```

## Code Style
CocoIndex v1 declarative style:
```python
@coco.fn(memo=True)
async def process_file(file: FileLike, out: pathlib.Path) -> None:
    ...
```
- Preserve existing secret/key redactions in `_sanitize_head`.
- Keep lightweight keyword/head snippets (Ponytail style - no speculative embedding vector DB until explicitly needed).

## Testing Strategy
- Execute `coco/.venv/bin/cocoindex update coco/main.py` from the project root.
- Validate exit code is 0.
- Verify `coco/out/` contains indexed files from:
  - `packages/auth_sdk/` and `packages/ui/`
  - `server/src/`
  - `mobile/lib/` (Dart files)
- Verify `coco/out/` does NOT contain build junk like `.dart_tool` or `build/` files.
- Run `npm run type-check` to confirm workspace scripts integrity.

## Boundaries
- **Always do:**
  - Redact potential secrets or private keys in snippet headers before outputting to `coco/out/`.
  - Maintain memoization (`memo=True`) so subsequent runs only process modified files.
  - Follow conventional commits for Git history.
- **Ask first:**
  - Adding vector embedding models (e.g. OpenAI / SentenceTransformers) or database connectors (Postgres/pgvector), which would introduce heavy external dependencies and compute overhead.
- **Never do:**
  - Commit `coco/cocoindex.db*` or `coco/.venv/` to Git.
  - Delete or bypass existing secret sanitization rules.

## Success Criteria
- [ ] `coco/.venv` is functional and runs `cocoindex update coco/main.py` cleanly.
- [ ] `coco/main.py` includes `packages`, `server`, `ai`, `tasks`, `migrations` and handles `**/*.dart`.
- [ ] No `.dart_tool` or build cache artifacts in `coco/out/`.
- [ ] `npm run index:coco` executes successfully.
- [ ] `coco/out/` is updated with accurate project snippets.

## Open Questions
- None. All requirements are bounded and aligned with the existing codebase structure.
