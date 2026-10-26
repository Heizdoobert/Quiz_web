# app/admin/[...module]/page.tsx
lines:21 exports:dynamic,default
---
import { notFound } from 'next/navigation';
import { ADMIN_MODULES } from '@/app/admin/_modules/registry.generated';
import AdminDenied from '@/components/admin/AdminDenied';
import { authorize } from '@/lib/services/auth/authorize';

export const dynamic = 'force-dynamic';

// Serves /admin/<id>/... for every folder in app/admin/_modules. The permission check lives
// here, before the module's code is loaded, so a module author cannot forget it on the page.
// Writes are still theirs to guard: a server action must call a service that authorizes.
export default async function AdminModuleRoute({ params }: { params: Promise<{ module: string[] }> }) {
  const [id, ...segments] = (await params).module;
  const entry = ADMIN_MODULES.find((m) => m.id === id);
  if (!entry) notFound();

  const auth = await authorize(entry.manifest.permission);
  if (!auth.success) return <AdminDenied code={auth.error.code} />;

  const { default: ModulePage } = await entry.load();
  return <ModulePage role={auth.data.role} segments={segments} />;
}
