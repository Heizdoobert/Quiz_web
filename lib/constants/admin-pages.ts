import type { Permission } from '@/lib/services/rbac';

// The admin pages in nav order. The first one a role may open is where /admin sends it.
// Each page still calls authorize() itself: this list only decides what the nav shows.
export const ADMIN_PAGES: readonly { href: string; label: string; permission: Permission }[] = [
  { href: '/admin/config', label: 'Config', permission: 'config.write' },
  { href: '/admin/roles', label: 'Roles', permission: 'roles.grant' },
  { href: '/admin/quarantine', label: 'Quarantine', permission: 'disputes.resolve' },
  { href: '/admin/errors', label: 'Errors', permission: 'errors.read' },
];
