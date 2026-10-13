import { redirect } from 'next/navigation';
import AdminDenied from '@/components/admin/AdminDenied';
import { ADMIN_PAGES } from '@/lib/constants/admin-pages';
import { authorize } from '@/lib/services/authorize';
import { can } from '@/lib/services/rbac';

// Sends the caller to the first admin page their role may open.
export default async function AdminIndex() {
  const auth = await authorize('disputes.resolve');
  if (!auth.success) return <AdminDenied code={auth.error.code} />;
  const first = ADMIN_PAGES.find((page) => can(auth.data.role, page.permission));
  if (first) redirect(first.href);
  return <AdminDenied />;
}
