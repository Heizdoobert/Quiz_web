import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserQuizzes, exportUserData } from '../lib/actions/profile-actions';
import { supabase } from '../lib/supabase';

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Valid Ethereum address for testing (40 hex chars after 0x)
const VALID_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const VALID_ADDRESS_CHECKSUMMED = '0x1234567890ABCDEF1234567890abcdef12345678';

describe('profile-actions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getUserQuizzes', () => {
    it('returns an error with code INVALID_ADDRESS if walletAddress is empty', async () => {
      const result = await getUserQuizzes('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('A valid wallet address is required.');
        expect(result.code).toBe('INVALID_ADDRESS');
      }
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('returns an error if walletAddress is not a valid Ethereum address', async () => {
      const result = await getUserQuizzes('not-an-address');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('A valid wallet address is required.');
        expect(result.code).toBe('INVALID_ADDRESS');
      }
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('normalizes address to lowercase before querying', async () => {
      const mockData = [{ id: '1', prompt: 'Test Question' }];
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

      await getUserQuizzes(VALID_ADDRESS_CHECKSUMMED);

      // Verify the address was lowercased
      expect(mockEq).toHaveBeenCalledWith('created_by', VALID_ADDRESS_CHECKSUMMED.toLowerCase());
    });

    it('returns user quizzes with public fields only (no correct_index leak)', async () => {
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

      const result = await getUserQuizzes(VALID_ADDRESS);

      expect(supabase.from).toHaveBeenCalledWith('questions');
      // Verify anti-cheat: ONLY public fields projected, correct_index and explanation omitted
      expect(mockSelect).toHaveBeenCalledWith('id, category, prompt, options, status, created_at, created_by');
      expect(mockEq).toHaveBeenCalledWith('created_by', VALID_ADDRESS);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockRange).toHaveBeenCalledWith(0, 499);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.quizzes).toEqual(mockData);
        expect(result.count).toBe(1);
      }
    });

    it('honors pagination offset, limit, and category filter', async () => {
      const mockData = [{ id: '2', prompt: 'DeFi Question', category: 'DeFi' }];
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

      const result = await getUserQuizzes(VALID_ADDRESS, { limit: 10, offset: 20, category: 'DeFi' });

      expect(mockEq).toHaveBeenCalledWith('created_by', VALID_ADDRESS);
      expect(mockEq).toHaveBeenCalledWith('category', 'DeFi');
      expect(mockRange).toHaveBeenCalledWith(20, 29);
      expect(result.success).toBe(true);
    });
  });

  describe('exportUserData', () => {
    it('returns an error with code INVALID_ADDRESS if walletAddress is empty', async () => {
      const result = await exportUserData('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('A valid wallet address is required for security.');
        expect(result.code).toBe('INVALID_ADDRESS');
      }
    });

    it('returns an error if walletAddress is invalid', async () => {
      const result = await exportUserData('0xinvalid');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('A valid wallet address is required for security.');
        expect(result.code).toBe('INVALID_ADDRESS');
      }
    });

    it('returns sanitized error with code EXPORT_FAILED when statsResponse fails (no DB leak)', async () => {
      let callCount = 0;
      (supabase.from as import("vitest").Mock).mockImplementation(() => {
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

      const result = await exportUserData(VALID_ADDRESS);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Must NOT leak internal database table/constraint names
        expect(result.error).toBe('Failed to fetch stats for export.');
        expect(result.code).toBe('EXPORT_FAILED');
      }
    });

    it('exports data successfully with schema version and normalized address', async () => {
      const mockQuizzes = [{ id: '1', prompt: 'Q1' }];
      const mockStats = [{ id: 's1', score: 100 }];

      let callCount = 0;
      (supabase.from as import("vitest").Mock).mockImplementation(() => {
        callCount++;
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(
                callCount === 1
                  ? { data: mockQuizzes, error: null }
                  : { data: mockStats, error: null }
              ),
            }),
          }),
        };
      });

      const result = await exportUserData(VALID_ADDRESS_CHECKSUMMED);

      expect(supabase.from).toHaveBeenCalledWith('questions');
      expect(supabase.from).toHaveBeenCalledWith('quiz_results');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe('1.0');
        expect(result.data.quizzes).toEqual(mockQuizzes);
        expect(result.data.stats).toEqual(mockStats);
        expect(result.data.walletAddress).toBe(VALID_ADDRESS_CHECKSUMMED.toLowerCase());
      }
    });
  });
});
