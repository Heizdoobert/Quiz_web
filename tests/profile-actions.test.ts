import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserQuizzes, exportUserData } from '../lib/actions/profile-actions';
import { supabase } from '../lib/supabase/supabase';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';
import { getSessionAccount } from '../lib/services/session';

// Mock the supabase module
vi.mock('../lib/supabase/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Export reads with the secret key, for the signed-in account only.
vi.mock('../lib/supabase/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));
vi.mock('../lib/services/session', () => ({
  getSessionAccount: vi.fn(),
}));

const ACCOUNT_ID = '00000000-0000-4000-8000-0000000000f1';
const ACCOUNT = { id: ACCOUNT_ID };

describe('profile-actions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getUserQuizzes', () => {
    it('refuses without a session, without querying', async () => {
      (getSessionAccount as import("vitest").Mock).mockResolvedValue(null);
      const result = await getUserQuizzes();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Sign in to see your quizzes.');
        expect(result.code).toBe('UNAUTHORIZED');
      }
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('returns user quizzes with public fields only (no correct_index leak)', async () => {
      (getSessionAccount as import("vitest").Mock).mockResolvedValue(ACCOUNT);
      const mockData = [{ id: '1', prompt: 'Test Question', options: ['A', 'B'], category: 'General' }];
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({ data: mockData, error: null });

      (supabase.from as import("vitest").Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        range: mockRange,
      });

      const result = await getUserQuizzes();

      expect(supabase.from).toHaveBeenCalledWith('questions');
      // Verify anti-cheat: ONLY public fields projected, correct_index and explanation omitted
      expect(mockSelect).toHaveBeenCalledWith('id, category, prompt, options, status, created_at');
      expect(mockEq).toHaveBeenCalledWith('created_by_user', ACCOUNT_ID);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockRange).toHaveBeenCalledWith(0, 499);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.quizzes).toEqual(mockData);
        expect(result.count).toBe(1);
      }
    });

    it('honors pagination offset, limit, and category filter', async () => {
      (getSessionAccount as import("vitest").Mock).mockResolvedValue(ACCOUNT);
      const mockData = [{ id: '2', prompt: 'Science Question', category: 'Science' }];
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({ data: mockData, error: null });

      (supabase.from as import("vitest").Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        range: mockRange,
      });

      const result = await getUserQuizzes({ limit: 10, offset: 20, category: 'Science' });

      expect(mockEq).toHaveBeenCalledWith('created_by_user', ACCOUNT_ID);
      expect(mockEq).toHaveBeenCalledWith('category', 'Science');
      expect(mockRange).toHaveBeenCalledWith(20, 29);
      expect(result.success).toBe(true);
    });
  });

  describe('exportUserData', () => {
    beforeEach(() => {
      (getSessionAccount as import("vitest").Mock).mockResolvedValue(ACCOUNT);
    });

    it('refuses to export without a session', async () => {
      (getSessionAccount as import("vitest").Mock).mockResolvedValue(null);
      const result = await exportUserData();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Sign in to export your data.');
        expect(result.code).toBe('UNAUTHORIZED');
      }
      expect(supabaseAdmin!.from).not.toHaveBeenCalled();
    });

    it('returns sanitized error with code EXPORT_FAILED when statsResponse fails (no DB leak)', async () => {
      let callCount = 0;
      (supabaseAdmin!.from as import("vitest").Mock).mockImplementation(() => {
        callCount++;
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(
                callCount === 1
                  ? { data: [], error: null }
                  : { data: null, error: { message: 'relation "quiz_results" does not exist' } }
              ),
            }),
          }),
        };
      });

      const result = await exportUserData();
      expect(result.success).toBe(false);
      if (!result.success) {
        // Must NOT leak internal database table/constraint names
        expect(result.error).toBe('Failed to fetch stats for export.');
        expect(result.code).toBe('EXPORT_FAILED');
      }
    });

    it('exports data keyed by account id, with schema version and the account id from the session', async () => {
      const mockQuizzes = [{ id: '1', prompt: 'Q1' }];
      const mockStats = [{ id: 's1', score: 100 }];
      const eqCalls: Array<[string, string]> = [];

      let callCount = 0;
      (supabaseAdmin!.from as import("vitest").Mock).mockImplementation(() => {
        callCount++;
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              eqCalls.push([col, val]);
              return {
                limit: vi.fn().mockResolvedValue(
                  callCount === 1
                    ? { data: mockQuizzes, error: null }
                    : { data: mockStats, error: null }
                ),
              };
            }),
          }),
        };
      });

      const result = await exportUserData();

      expect(supabaseAdmin!.from).toHaveBeenCalledWith('questions');
      expect(supabaseAdmin!.from).toHaveBeenCalledWith('quiz_results');
      expect(eqCalls).toContainEqual(['created_by_user', ACCOUNT_ID]);
      expect(eqCalls).toContainEqual(['user_id', ACCOUNT_ID]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe('1.0');
        expect(result.data.quizzes).toEqual(mockQuizzes);
        expect(result.data.stats).toEqual(mockStats);
        expect(result.data.accountId).toBe(ACCOUNT_ID);
        expect(result.data.isTruncated).toBe(false);
      }
    });

    it('sets isTruncated to true when quizzes or stats reach max export limit', async () => {
      const cappedQuizzes = new Array(1000).fill({ id: 'q' });
      let callCount = 0;
      (supabaseAdmin!.from as import("vitest").Mock).mockImplementation(() => {
        callCount++;
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(
                callCount === 1
                  ? { data: cappedQuizzes, error: null }
                  : { data: [], error: null }
              ),
            }),
          }),
        };
      });

      const result = await exportUserData();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isTruncated).toBe(true);
      }
    });
  });
});
