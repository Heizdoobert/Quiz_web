import type { Metadata } from 'next';
import { adminNavItems } from '@/app/admin/_modules/nav';
import AdminDenied from '@/components/admin/AdminDenied';
import AdminNav from '@/components/admin/AdminNav';
import { authorize } from '@/lib/services/auth/authorize';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

// A layout does not re-render on client navigation, so it is not a security boundary: every
// page calls authorize() for its own permission. This one only keeps the shell and the nav
// from anyone below moderator, the lowest role that may open an admin page.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await authorize('disputes.resolve');
  if (!auth.success) return <AdminDenied code={auth.error.code} />;
  return (
    <div>
      <AdminNav items={adminNavItems(auth.data.role)} />
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
