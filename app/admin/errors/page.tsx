import AdminDenied from '@/components/admin/AdminDenied';
import IssueList from '@/components/admin/IssueList';
import { authorize } from '@/lib/services/auth/authorize';
import { listErrorIssues } from '@/lib/services/api/error-issues';

export const dynamic = 'force-dynamic';

export default async function AdminErrorsPage() {
  const auth = await authorize('errors.read');
  if (!auth.success) return <AdminDenied code={auth.error.code} />;
  const result = await listErrorIssues(auth.data.account);

  return (
    <section>
      <h1 className="text-2xl font-black font-heading text-white mb-1">Error tracking</h1>
      <p className="text-sm text-slate-300 mb-6">The most frequent unresolved Sentry issues. Read-only.</p>
      {!result.success ? (
        <p role="alert" className="text-pop-coral">{result.error.message}</p>
      ) : result.data.configured ? (
        <IssueList issues={result.data.issues} />
      ) : (
        <p role="status" className="text-slate-300">
          Not configured. Set SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT on the server.
        </p>
      )}
    </section>
  );
}
