import AdminDenied from '@/components/admin/AdminDenied';
import ReportDashboard from '@/components/admin/ReportDashboard';
import { authorize } from '@/lib/services/authorize';
import { getReportStatus } from '@/lib/services/report-admin';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const auth = await authorize('analytics.read');
  if (!auth.success) return <AdminDenied code={auth.error.code} />;

  const result = await getReportStatus(auth.data.account);

  return (
    <section>
      <h1 className="text-2xl font-black font-heading text-white mb-1">System Reports & Cron</h1>
      <p className="text-sm text-slate-300 mb-6">
        Daily automated health digests and on-demand report dispatching.
      </p>
      {!result.success ? (
        <p role="alert" className="text-pop-coral">{result.error.message}</p>
      ) : (
        <ReportDashboard initial={result.data} />
      )}
    </section>
  );
}
