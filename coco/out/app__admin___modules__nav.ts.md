# app/admin/_modules/nav.ts
lines:16 exports:adminNavItems
---
import { ADMIN_PAGES } from '@/lib/constants/admin-pages';
import { can } from '@/lib/services/rbac/rbac';
import { ADMIN_MODULES } from './registry.generated';

// The five pages that predate modules come first in their own order, then the modules by
// manifest order and label. Only what the role may open: a convenience, never the check
// (each page and the module route authorize for themselves).
export function adminNavItems(role: unknown): { href: string; label: string }[] {
  const modules = ADMIN_MODULES.map(({ id, manifest }) => ({
    href: `/admin/${id}`,
    label: manifest.label,
    permission: manifest.permission,
    order: manifest.order ?? Number.POSITIVE_INFINITY,
  })).sort((a, b) => (a.order === b.order ? a.label.localeCompare(b.label) : a.order - b.order));
  return [...ADMIN_PAGES, ...modules].filter((item) => can(role, item.permission));
}
