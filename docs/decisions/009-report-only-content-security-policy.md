# ADR-009: Content-Security-Policy Ships Report-Only First

## Status
Accepted. Enforcement is pending a preview observation.

## Date
2026-10-09 (written from the code on this date)

## Context
Wagmi, RainbowKit and WalletConnect need broad `connect-src` and `frame-src` allowances, and Next's inline hydration scripts need `'unsafe-inline'` until nonces are rolled out. A strict enforced policy written blind would break wallet sign-in.

## Decision
`next.config.mjs` sends an enforced `Content-Security-Policy: frame-ancestors 'none'` and a separate `Content-Security-Policy-Report-Only` policy that constrains `default-src`, `connect-src`, `frame-src`, `object-src`, `base-uri` and `form-action`, with `report-uri /api/csp-report`. `app/api/csp-report/route.ts` writes each violation to the server log as `csp_violation`, stores nothing and answers 204.

The policy is enforced only after a full wallet, email and username sign-in on preview produces no first-party violations.

## Consequences
- **Positive**: real violations are collected without risking a broken sign-in.
- **Trade-off**: until enforcement, the policy does not block anything beyond framing. `script-src` allows `'unsafe-inline'`, so it would not stop injected inline scripts even when enforced; nonces are the follow-up.
- **Next step**: review `csp_violation` logs after a preview session, then move the directives to the enforced header (todo.md, Part 1 Task 6).
