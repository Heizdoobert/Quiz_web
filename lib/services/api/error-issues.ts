import 'server-only';
import { logger } from '@/lib/logger';
import { ActionResult } from '@/lib/types';
import { authorize } from '@/lib/services/auth/authorize';
import { SessionAccount } from '@/lib/services/auth/session';

// Read-only view of Sentry's top unresolved issues, over its REST API (no vendor package, so it
// does not depend on the optional sdk/tracking-analytics). SENTRY_AUTH_TOKEN needs only the
// event:read scope. Nothing from a failed response, and never the token, is logged or returned.
const TIMEOUT_MS = 5000;
const LIMIT = 25;

export type ErrorIssue = { id: string; title: string; level: string; count: number; lastSeen: string; link: string | null };
export type ErrorIssues = { configured: false } | { configured: true; issues: ErrorIssue[] };

const text = (v: unknown) => (typeof v === 'string' ? v : '');

function toIssue(raw: unknown): ErrorIssue | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const permalink = text(r.permalink);
  return {
    id: text(r.id),
    title: text(r.title),
    level: text(r.level),
    count: Number(r.count) || 0, // Sentry sends the count as a string
    lastSeen: text(r.lastSeen),
    link: permalink.startsWith('https://') ? permalink : null, // never a javascript: or data: URL
  };
}

export async function listErrorIssues(authAccount?: SessionAccount): Promise<ActionResult<ErrorIssues>> {
  // Before anything else, so a caller without the permission learns nothing, not even whether Sentry is set up.
  const auth = await authorize('errors.read', authAccount);
  if (!auth.success) return auth;

  const { SENTRY_AUTH_TOKEN: token, SENTRY_ORG: org, SENTRY_PROJECT: project } = process.env;
  if (!token || !org || !project) return { success: true, data: { configured: false } };

  // The organization endpoint: Sentry deprecated the project-level one.
  const url =
    `https://sentry.io/api/0/organizations/${encodeURIComponent(org)}/issues/` +
    `?project=${encodeURIComponent(project)}&query=${encodeURIComponent('is:unresolved')}&sort=freq&limit=${LIMIT}`;
  const failure = { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load error tracking.' } } as const;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      logger.error('error_issues_failed', undefined, { status: res.status });
      return failure;
    }
    const body: unknown = await res.json();
    if (!Array.isArray(body)) return failure;
    return { success: true, data: { configured: true, issues: body.map(toIssue).filter((i): i is ErrorIssue => i !== null) } };
  } catch (err) {
    logger.error('error_issues_failed', err);
    return failure;
  }
}
