import type { AdminModuleManifest } from '../types';

// Pure data only: the nav imports this on every admin page.
const manifest: AdminModuleManifest = {
  label: 'Template',
  permission: 'analytics.read', // who may open it; pick from PERMISSIONS in lib/services/rbac.ts
  // order: 10, // optional; lower first
};

export default manifest;
