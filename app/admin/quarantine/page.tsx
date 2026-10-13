import AdminDenied from '@/components/admin/AdminDenied';
import QuarantineList from '@/components/admin/QuarantineList';
import { authorize } from '@/lib/services/authorize';
import { listQuarantinedQuestions } from '@/lib/services/moderation';

export const dynamic = 'force-dynamic';

export default async function AdminQuarantinePage() {
  const auth = await authorize('disputes.resolve');
  if (!auth.success) return <AdminDenied code={auth.error.code} />;
  const list = await listQuarantinedQuestions({ limit: 20, offset: 0 }, auth.data.account);

  return (
    <section>
      <h1 className="text-2xl font-black font-heading text-white mb-1">Quarantine</h1>
      <p className="text-sm text-slate-300 mb-6">Restore puts a question back in play. Retire rejects it.</p>
      {list.success ? <QuarantineList initial={list.data.questions} /> : <p role="alert" className="text-pop-coral">{list.error.message}</p>}
    </section>
  );
}
