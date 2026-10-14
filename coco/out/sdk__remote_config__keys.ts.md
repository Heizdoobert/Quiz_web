# sdk/remote_config/keys.ts
lines:8 exports:KEYS
---
// The only keys the route may return. Add a key here and the types follow; the table may hold
// other rows, but they never leave the server.
export const KEYS = {
  maintenance_mode: {
    default: false,
    parse: (v: unknown) => (typeof v === 'boolean' ? v : undefined),
  },
};
