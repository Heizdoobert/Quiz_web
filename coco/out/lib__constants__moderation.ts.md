# lib/constants/moderation.ts
lines:3 exports:MAX_NOTE_LENGTH
---
// Apart from lib/services/moderation.ts so a client component can import it without pulling
// in that module's server-only database code.
export const MAX_NOTE_LENGTH = 500;
