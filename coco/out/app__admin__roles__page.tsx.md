# app/admin/roles/page.tsx
lines:24 exports:dynamic,default
---
import AdminDenied from '@/components/admin/AdminDenied';
import RoleTable from '@/components/admin/RoleTable';
import { authorize } from '@/lib/services/authorize';
import { listAccountsForAdmin } from '@/lib/services/role-admin';

export const dynamic = 'force-dynamic';

export default async function AdminRolesPage() {
  const auth = await authorize('roles.grant');
  if (!auth.success) return <AdminDenied code={auth.error.code} />;
  const list = await listAccountsForAdmin({ search: '', limit: 20, offset: 0 }, auth.data.account);

  return (
    <section>
      <h1 className="text-2xl font-black font-heading text-white mb-1">Roles</h1>
      <p className="text-sm text-slate-300 mb-6">A role change takes effect on the account&apos;s next request.</p>
      {list.success ? (
        <RoleTable initial={list.data.accounts} selfId={auth.data.account.id} />
      ) : (
        <p role="alert" className="text-pop-coral">{list.error.message}</p>
      )}
    </section>
  );
}
