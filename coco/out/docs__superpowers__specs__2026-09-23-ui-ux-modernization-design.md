# docs/superpowers/specs/2026-09-23-ui-ux-modernization-design.md
lines:68 exports:
---
# UI/UX Modernization — Neo-Crypto Glassmorphism

## Context

Current UI is a dark "cyber-crypto" theme (deep navy background, neon mint/indigo/gold/coral glow effects, Orbitron+Exo2 fonts) built for a crypto trivia quiz with DeFi/NFT/L1 category branding. It reads as ~2021-era web3 aesthetic (heavy neon glow box-shadows, flat gradient badges), which is the source of the "outdated" feeling — not a UX/functional problem.

## Goals

- Whole-app visual + structural redesign to feel modern (2025/2026-era), judged by the maintainer's own eye — no external stakeholder, no user complaints driving this.
- No brand/color constraints: palette, typography, layout, and structure are all open to change.
- Stays within the existing stack: Next.js 16 App Router, Tailwind CSS v4, framer-motion (already a dependency). No new dependencies.

## Out of scope

- No new features or quiz-logic/backend changes — presentation layer only.
- No new npm dependencies.

## Chosen direction: Neo-Crypto Glassmorphism

Evolves the existing cyber-crypto identity (keeps color palette and category branding recognizable) rather than discarding it. Modernizes the *execution*: frosted-glass surfaces with layered blur, softer/larger radii, gradient meshes instead of flat neon glows, more breathing room.

Two other directions were considered and rejected: a full "Refined Dark Editorial" teardown (abandons the crypto-gamey identity, risks feeling generic) and a "Light, Bold, Playful" light-mode pivot (near-total identity change, reads less crypto-native). Neo-Crypto Glassmorphism was chosen because it fixes the dated *execution* without discarding the identity already built around category branding.

## Design

### A. Visual language / tokens

- Keep base palette: deep-space navy, neo-mint, electric-indigo, crypto-gold, pop-coral, category colors (`cat-defi`, `cat-nft`, `cat-l1`) — brand recognition stays.
- Retire flat `glow-*` box-shadow utilities → replace with layered glass: translucent surface background + `backdrop-filter: blur(20px)` + a thin 1px gradient border, instead of a colored halo shadow.
- Add a mid-tone surface layer between `--color-deep-space` and `--color-cyber-violet` for depth stacking — currently only 2 elevation tones exist, need 3 to distinguish stacked/floating cards.
- Radii: bump from current `rounded-lg`/`rounded-xl` to `rounded-2xl`/`rounded-3xl` on cards — softer, more current web3-wallet aesthetic (Rainbow/Coinbase) vs current sharper cyberpunk edges.
- Typography: keep Orbitron for hero/score numbers only (signature display moment). Drop it from section headings — use Exo2 at a higher weight instead. Reduces "2021 web3 template" feel while keeping one identity anchor.
- Spacing: increase card padding and inter-section gaps ~25-30% — current layout reads dense/cramped; more whitespace is most of what "modern" cashes out to visually.

### B. Component patterns

- **Cards** (QuizCard, leaderboard rows, stat panels): move from flat `cyber-violet` fill to the new glass surface (blur + gradient border). Add a subtle 1px top inset highlight for a glass-edge catch-light effect.
- **Buttons/CTAs**: primary buttons switch from always-on solid `gradient-claim`/`gradient-victory` fills to gradient-border + glass fill, with the gradient becoming a hover/press state (scale + brighten) rather than always-on.
- **Category badges** (DeFi/NFT/L1): keep distinct colors, flatten from glow-pill to solid-chip-with-glass-outline.
- **Modals** (Intro/Profile/Group/Rewards/TimerSettings/Dispute): unify on one glass modal shell via the shared `Modal.tsx` primitive — increased backdrop blur, new elevation-3 surface tone, consistent header/close-button treatment across all 6.
