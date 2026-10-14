# Admin OWASP ZAP Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-only portal at `/admin/owasp` with an automated OWASP ZAP baseline scanner in Docker, high-risk alert viewing, and Supabase HTML report storage.

**Architecture:** Implement App Router page (`app/admin/owasp/page.tsx`) with server-side authentication check, interactive client component (`components/admin/OwaspScanClient.tsx`), and App Router scan endpoint (`app/api/owasp/scan/route.ts`) executing ZAP via Docker and uploading reports to Supabase storage.

**Tech Stack:** Next.js 14 (App Router), TypeScript, React, Tailwind CSS, `@supabase/ssr`, Docker (OWASP ZAP baseline container), Vitest.

**Spec:** docs/superpowers/specs/2026-10-13-admin-owasp-portal.md

## Global Constraints

- Must run within Next.js App Router conventions (`app/` directory).
- All TypeScript code must pass `npm run type-check` with 0 errors.
- Authentication must strictly check email against `ADMIN_EMAILS` environment variable.
- Storage bucket name is fixed: `owasp-reports`.
- Target scan URL defaults to `process.env.NEXT_PUBLIC_APP_URL || 'http://host.docker.internal:3000'`.

---

### Task 1: Setup Admin OWASP Page & Client Component

**Files:**
- Create: `components/admin/OwaspScanClient.tsx`
- Create: `app/admin/owasp/page.tsx`

**Interfaces:**
- Consumes: `@supabase/ssr`, `next/headers`, `next/navigation`
- Produces: Default export React Server Component in `app/admin/owasp/page.tsx` and interactive UI in `components/admin/OwaspScanClient.tsx`

- [x] **Step 1: Create client component for scan interactions**
Write `components/admin/OwaspScanClient.tsx` with:
- State for `loading`, `error`, `results` (`{ highAlerts: Array<{ name: string; risk: string; description: string }>; reportUrl: string } | null`).
- Button with loading indicator to trigger POST to `/api/owasp/scan`.
- Display of high/critical alerts or friendly empty message when scan returns clean.
- Link to download full HTML report.

- [x] **Step 2: Create server component page with admin auth guard**
Write `app/admin/owasp/page.tsx` with:
- Force dynamic rendering (`export const dynamic = 'force-dynamic'`).
- Auth check using `@supabase/ssr` with `cookies()` from `next/headers`.
- Email check against `process.env.ADMIN_EMAILS?.split(',') ?? []`.
- Redirect to `/` or render unauthorized view if not authenticated or not in `ADMIN_EMAILS`.
- Render `OwaspScanClient` when authorized.

---

### Task 2: Implement Scan API Route in App Router

**Files:**
- Create: `app/api/owasp/scan/route.ts`

**Interfaces:**
- Consumes: Next.js Route Handler `POST(req: Request)`, `@supabase/ssr`, `cookies` from `next/headers`, `child_process.exec`, `fs/promises.readFile`, Supabase Storage API.
- Produces: JSON response with `{ highAlerts: Alert[]; reportUrl: string }` or appropriate error status (401, 403, 500).

- [x] **Step 1: Implement App Router POST handler**
Write `app/api/owasp/scan/route.ts` with:
- Server-side cookie validation with `@supabase/ssr`.
- Guard against non-admin emails (401 if unauthenticated, 403 if not admin).
- Execute `docker run --rm -v /tmp:/zap/wrk zaproxy/zap2docker-stable zap-baseline.py -t <targetUrl> -r <reportFileName>`.
- Read HTML report from `/tmp/<reportFileName>`.
- Parse table rows or alert tags to extract high and critical alerts.
- Upload report file to Supabase storage bucket `owasp-reports`.
- Retrieve public URL via `supabase.storage.from('owasp-reports').getPublicUrl()`.
- Return `NextResponse.json({ highAlerts, reportUrl })`.

---

### Task 3: Clean Up Deprecated Pages & Verify Compilation

**Files:**
- Delete: `pages/admin/owasp.tsx`
- Delete: `pages/api/owasp/scan.ts`
- Remove empty `pages/` directory

**Interfaces:**
- Consumes: `tsconfig.json`
- Produces: Clean codebase passing `npm run type-check`

- [x] **Step 1: Remove untracked legacy pages directory**
Delete `pages/admin/owasp.tsx`, `pages/api/owasp/scan.ts`, and `pages/`.

- [x] **Step 2: Run type check**
Run `npm run type-check`. Verify 0 errors.

---

### Task 4: Unit & Integration Testing

**Files:**
- Create: `tests/admin-owasp.test.ts`

**Interfaces:**
- Consumes: Vitest test framework
- Produces: Automated test suite validating alert extraction logic and auth check rules

- [x] **Step 1: Write tests for alert parsing and admin authorization logic**
Create `tests/admin-owasp.test.ts` testing:
- High/critical alert regex extraction from mock ZAP HTML report.
- Whitelist matching against `ADMIN_EMAILS`.
- Error handling when report file is missing or invalid.

- [x] **Step 2: Run test suite**
Run `npx vitest run tests/admin-owasp.test.ts` and verify all tests pass.
