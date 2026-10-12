import { describe, it, expect } from 'vitest';
import { DbError, unwrap, unwrapOne, countOf, NO_ROWS } from '../lib/db/errors';

describe('lib/db/errors', () => {
  it('unwrap returns data when there is no error', () => {
    expect(unwrap('t.op', { data: [1, 2], error: null })).toEqual([1, 2]);
  });

  it('unwrap throws a DbError carrying the op, code and message', () => {
    try {
      unwrap('questions.insert', { data: null, error: { message: 'boom', code: '42P01' } });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(DbError);
      expect(err).toMatchObject({ op: 'questions.insert', code: '42P01', message: 'questions.insert: boom' });
    }
  });

  it('unwrapOne turns a missing .single() row into null', () => {
    expect(unwrapOne('t.op', { data: null, error: { message: 'no rows', code: NO_ROWS } })).toBeNull();
    expect(() => unwrapOne('t.op', { data: null, error: { message: 'down' } })).toThrow(DbError);
  });

  it('countOf returns the count, 0 for null, and throws on error', () => {
    expect(countOf('t.op', { count: 7, error: null })).toBe(7);
    expect(countOf('t.op', { count: null, error: null })).toBe(0);
    expect(() => countOf('t.op', { count: null, error: { message: 'down' } })).toThrow(DbError);
  });
});
