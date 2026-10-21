# app/admin/_modules/types.ts
lines:24 exports:AdminModuleManifest,AdminModuleProps,AdminModulePage,AdminModule
---
import type { ReactNode } from 'react';
import type { Permission, Role } from '@/lib/services/rbac';

// A module is the folder app/admin/_modules/<id>/ with a manifest.ts and a page.tsx.
// The id is the folder name and the URL segment: /admin/<id>.
// A manifest must stay pure (no server imports): the nav reads it on every admin page.
export type AdminModuleManifest = {
  label: string;
  permission: Permission;
  order?: number; // lower first; modules without one sort after, by label
};

export type AdminModuleProps = {
  role: Role;
  segments: string[]; // the URL after /admin/<id>
};

export type AdminModulePage = (props: AdminModuleProps) => ReactNode | Promise<ReactNode>;

export type AdminModule = {
  id: string;
  manifest: AdminModuleManifest;
  load: () => Promise<{ default: AdminModulePage }>;
};
