# SECURITY-TRADE-OFFS.md
lines:72 exports:
---
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
