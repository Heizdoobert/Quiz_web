# lib/db/errors.ts
lines:39 exports:UNIQUE_VIOLATION,FK_VIOLATION,NO_ROWS,DbResult,CountResult,DbError,unwrap,unwrapOne,countOf
---
// Turns Supabase's { data, error } into data or one thrown DbError. No clients here, so
// any file may import it (to check `instanceof DbError`); lib/db never logs, callers do.

export const UNIQUE_VIOLATION = '23505';
export const FK_VIOLATION = '23503';
// PostgREST's "no row" from .single().
export const NO_ROWS = 'PGRST116';

type PgError = { message: string; code?: string };
export type DbResult<T> = { data: T | null; error: PgError | null };
export type CountResult = { count: number | null; error: PgError | null };

export class DbError extends Error {
  readonly op: string;
  readonly code?: string;

  constructor(op: string, cause: PgError) {
    super(`${op}: ${cause.message}`);
    this.name = 'DbError';
    this.op = op;
    this.code = cause.code;
  }
}

export function unwrap<T>(op: string, res: DbResult<T>): T | null {
  if (res.error) throw new DbError(op, res.error);
  return res.data;
}

// For .single() lookups, where no row is a normal answer rather than a failure.
export function unwrapOne<T>(op: string, res: DbResult<T>): T | null {
  if (res.error?.code === NO_ROWS) return null;
  return unwrap(op, res);
}

export function countOf(op: string, res: CountResult): number {
  if (res.error) throw new DbError(op, res.error);
  return res.count ?? 0;
}
