// Roles are data (users.role); permissions are code, so adding one is a reviewed change.
// Pure: reading the role from the database is lib/services/authorize.ts.

export const ROLES = ['user', 'moderator', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = ['roles.grant', 'disputes.resolve', 'analytics.read', 'db.read', 'config.write', 'errors.read'] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  user: [],
  moderator: ['disputes.resolve'],
  admin: PERMISSIONS, // everything, so it always includes what a moderator can do
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

// Takes unknown so a value straight from the database or a request body is denied, not cast.
export function can(role: unknown, permission: Permission): boolean {
  return isRole(role) && ROLE_PERMISSIONS[role].includes(permission);
}
