# Security Posture & Threat Model: Quick Quiz

## 1. Threat Model & STRIDE Analysis

| Threat | Risk Analysis | Mitigations Implemented |
|---|---|---|
| **S**poofing | Client claims to own an EVM wallet address without cryptographic signature (SIWE). | Strict EIP-55 format regex validation (`isValidEthAddress`); addresses normalized to lowercase; roadmap item for SIWE integration. |
| **T**ampering | Client manipulates query parameters or sends malicious payloads to Server Actions. | Bounded limit caps (max 500); parameterized queries via Supabase PostgREST; schema validation. |
| **R**epudiation | State-changing operations performed without attribution. | Actions require explicit wallet address parameter; database audit timestamps on `questions` and `quiz_results`. |
| **I**nformation Disclosure | Attackers query questions to extract `correct_index` and `explanation` before answering, bypassing anti-cheat. | **Hardened projection**: `getUserQuizzes` strictly selects public display fields (`id, category, prompt, options, status, created_at, created_by`), omitting `correct_index` and `explanation`. Raw database errors are sanitized. |
| **D**enial of Service | Malicious actor queries massive rowsets or floods database with large payloads. | Explicit caps on queries (`limit: 500`, export capped at 1000 questions and 5000 stats); range pagination. |
| **E**levation of Privilege | Standard user attempts to perform admin or creator operations on arbitrary resources. | Restricted database projection; isolation of creator questions by address. |

---

## 2. Hardening Controls Implemented

### HTTP Security Headers (OWASP Recommended)
Configured globally in `next.config.js`:
- `X-Content-Type-Options: nosniff` (prevents MIME sniffing)
- `X-Frame-Options: DENY` (clickjacking protection)
- `Referrer-Policy: strict-origin-when-cross-origin` (protects referral leakage)
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` (restricts sensitive hardware APIs)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (enforces HTTPS)

### Server Action Boundaries & Sanitization
- **Strict Format Regex**: `^0x[0-9a-fA-F]{40}$` rejects injection attacks and non-hex inputs at the boundary.
- **Address Lowercasing**: Eliminates EIP-55 case-sensitivity bypasses.
- **Error Sanitization**: Backend database errors (e.g. relation or constraint errors) are logged internally (`console.error`) and never reflected back to clients.

### Privacy & Data Portability (GDPR Article 20)
- **Export Endpoint**: `exportUserData` provides structured, machine-readable JSON backups (`quizzes` and `stats`) with schema versioning (`1.0`).
- **Data Minimization**: Only quiz questions and game results associated with the wallet are retained.

---

## 3. Dependency Audit Triage (`npm audit`)

As of September 2026, `npm audit` reports 23 moderate and 1 high vulnerability in transitive dependencies:
- **High (`ws: Memory disclosure / DoS`)**: Arises from `viem` inside `@walletconnect/utils` (used by `@rainbow-me/rainbowkit` and `wagmi`).
- **Moderate (`uuid: buffer bounds check`)**: Arises from `@metamask/sdk` dependencies.
- **Triage Decision**:
  - `npm audit fix --force` would attempt a major version upgrade to `wagmi@3.x`, introducing breaking changes across RainbowKit 2.x and React 19 bindings.
  - Since websocket connections in `@walletconnect` are initiated client-side to authenticated relay endpoints rather than serving unauthenticated inbound sockets, reachability for remote code execution or server DoS is low.
  - **Action**: Deferred until RainbowKit publishes official updates resolving the upstream `@walletconnect` dependencies.

---

## 4. Resolved Security Milestones & Current Architecture

### A. Cryptographic Session Authentication (SIWE) — RESOLVED
- **Implementation**: EIP-4361 Sign-In with Ethereum (`auth-actions.ts`, `wallet-session.ts`).
- **Enforcement**: State-changing Server Actions (`createQuestion`, `submitAnswer`, `createList`, `exportUserData`) authenticate the caller via tamper-proof, HTTP-only HMAC session cookies (`quiz_session`) issued only after verifying the user's private key signature.
- **Impact**: Eliminates wallet spoofing and IDOR risks across user data export and submission workflows.

### B. Supabase RLS Write Lock-Down — RESOLVED
- **Implementation**: `lib/sql/lock-down-public-writes.sql` and `lib/sql/question-lists.sql`.
- **Enforcement**: All public write access (`INSERT`, `UPDATE`, `DELETE`) is completely disabled at the database level for the anonymous client. All writes are mediated through `supabaseAdmin` with the server-side secret key (`SUPABASE_SECRET_KEY`).
- **Impact**: Prevents direct database manipulation and unauthenticated result injection.

### C. Contest Payout Escrow & Anti-Drain — ACTIVE MITIGATION
- **Constraint**: List creators define contest reward pools and possess advance knowledge of all correct answers.
- **Enforcement**: Public arbitrary voucher signing (`buildTokenClaimVoucher`) has been eliminated. Contest reward claims (`claimListReward`) return `{ error: 'Contest payouts are paused.' }` until an on-chain staking/escrow contract is deployed to custody creator funds before contests go live.

---

## 5. Architectural Decision Records (ADRs)
For detailed design decisions and trade-offs, consult:
- [ADR-001: Sign-In with Ethereum & Session Authorization](docs/decisions/001-siwe-session-authorization.md)
- [ADR-002: Dual-Key Supabase Architecture & RLS Lockdown](docs/decisions/002-dual-key-supabase-rls-lockdown.md)
- [ADR-003: Peer-Reviewed Question Lists & Voucher Safeguards](docs/decisions/003-question-lists-and-contest-voucher-safeguards.md)
- [ADR-004: Next.js Server Action Bundling & Module Separation](docs/decisions/004-server-action-module-separation.md)
