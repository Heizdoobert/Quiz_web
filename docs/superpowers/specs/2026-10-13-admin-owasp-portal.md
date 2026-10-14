# Admin OWASP ZAP Portal Specification

## Overview
An administrative portal within `web_quiz` allowing authorized admins to trigger OWASP ZAP automated baseline security scans against the application, view high/critical vulnerability findings directly in the browser, and download the full HTML scan report.

## Access Control
- Restrict `/admin/owasp` and `/api/owasp/scan` strictly to authenticated users whose emails match `ADMIN_EMAILS` (comma-separated list in environment variables).
- Server-side guard in Next.js using `@supabase/ssr` to verify user session via cookie store and ensure non-admins are redirected or denied with 403 Forbidden.

## Architecture & Workflow
1. **Frontend (`pages/admin/owasp.tsx`)**:
   - `getServerSideProps` checks Supabase authentication and admin email whitelist. Non-admins redirect to `/`.
   - UI provides a "Run ZAP Scan" button with loading/disabled state while running.
   - On completion, renders list of high/critical alerts (name, risk level, description) and a download link for the full HTML report.
   - Shows error feedback if the scan or network request fails.
2. **Scan API (`pages/api/owasp/scan.ts`)**:
   - Accepts POST requests from authenticated admins only.
   - Target URL defined by `NEXT_PUBLIC_APP_URL` (default: `http://host.docker.internal:3000`).
   - Executes OWASP ZAP baseline scan in Docker:
     `docker run --rm -v /tmp:/zap/wrk zaproxy/zap2docker-stable zap-baseline.py -t <targetUrl> -r <reportFileName>`
   - Reads generated HTML report from `/tmp`.
   - Parses high and critical alerts.
   - Uploads HTML report to Supabase storage bucket `owasp-reports`.
   - Obtains public URL for the report.
   - Returns `{ highAlerts, reportUrl }`.
3. **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ADMIN_EMAILS`
   - `NEXT_PUBLIC_APP_URL` (optional, defaults to `http://host.docker.internal:3000`)
4. **Storage**:
   - Supabase storage bucket named `owasp-reports`.
