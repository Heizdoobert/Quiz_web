# app/admin/page.tsx
lines:13 exports:default
---
import { redirect } from 'next/navigation';
import { adminNavItems } from '@/app/admin/_modules/nav';
import AdminDenied from '@/components/admin/AdminDenied';
import { authorize } from '@/lib/services/authorize';

// Sends the caller to the first admin page or module their role may open.
export default async function AdminIndex() {
  const auth = await authorize('disputes.resolve');
  if (!auth.success) return <AdminDenied code={auth.error.code} />;
  const [first] = adminNavItems(auth.data.role);
  if (first) redirect(first.href);
  return <AdminDenied />;
}
