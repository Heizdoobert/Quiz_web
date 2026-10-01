# docs/intent/agent-code-index.md
lines:8 exports:
---
# Intent: Agent Code Index

- **Outcome:** Static CocoIndex file index over all code + docs so another AI agent finds any point in 1–2 reads.
- **User:** Future AI agents exploring this repo.
- **Why now:** Finding things today costs full grep / many reads.
- **Success:** One map doc (<100 lines) points to the right file in 1 read; `coco/out/` covers every source file.
- **Constraint:** Lowest-context, caveman-ultra: stdlib only, no embeddings, no service, no new JS dep.
- **Out of scope:** Live API / MCP server, player-facing search, UI change.
