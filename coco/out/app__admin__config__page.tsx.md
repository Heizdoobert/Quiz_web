# app/admin/config/page.tsx
lines:35 exports:dynamic,default
---
import AdminDenied from '@/components/admin/AdminDenied';
import ConfigToggle from '@/components/admin/ConfigToggle';
import { logger } from '@/lib/logger';
import { authorize } from '@/lib/services/auth/authorize';
import { getRemoteConfig } from '@/sdk/remote_config';

export const dynamic = 'force-dynamic';

export default async function AdminConfigPage() {
  const auth = await authorize('config.write');
  if (!auth.success) return <AdminDenied code={auth.error.code} />;

  let config: Awaited<ReturnType<typeof getRemoteConfig>> | null = null;
  try {
    config = await getRemoteConfig();
  } catch (err) {
    logger.error('admin_config_load_failed', err);
  }

  return (
    <section>
      <h1 className="text-2xl font-black font-heading text-white mb-1">Remote config</h1>
      <p className="text-sm text-slate-300 mb-6">
        Changes reach <code>/api/config</code> within about a minute under steady traffic, and up to six minutes after a quiet spell.
      </p>
      {config ? (
        Object.entries(config).map(([name, value]) =>
          typeof value === 'boolean' ? <ConfigToggle key={name} name={name} initial={value} /> : null
        )
      ) : (
        <p role="alert" className="text-pop-coral">Could not load the config. Try again in a moment.</p>
      )}
    </section>
  );
}
