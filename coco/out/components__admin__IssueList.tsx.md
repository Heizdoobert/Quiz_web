# components/admin/IssueList.tsx
lines:26 exports:default
---
import type { ErrorIssue } from '@/lib/services/api/error-issues';

// Sentry's text is rendered as text; the link is only ever an https URL (see error-issues.ts).
export default function IssueList({ issues }: { issues: ErrorIssue[] }) {
  if (issues.length === 0) return <p className="text-slate-300">No unresolved issues.</p>;
  return (
    <ul>
      {issues.map((issue) => (
        <li key={issue.id} className="py-3 border-b border-cyber-border">
          <p className="text-white">{issue.title}</p>
          <p className="text-sm text-slate-300">
            {issue.level} · {issue.count} events · last seen {issue.lastSeen}
            {issue.link && (
              <>
                {' · '}
                <a href={issue.link} target="_blank" rel="noopener noreferrer" className="underline text-neo-mint">
                  Open in Sentry
                </a>
              </>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
