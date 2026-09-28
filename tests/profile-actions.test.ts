import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserQuizzes, exportUserData } from '../lib/actions/profile-actions';
import { supabase } from '../lib/supabase';

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('profile-actions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getUserQuizzes', () => {
    it('returns an error if walletAddress is empty', async () => {
      const result = await getUserQuizzes('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Wallet address is required.');
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('returns user quizzes successfully', async () => {
      const mockData = [{ id: '1', prompt: 'Test Question' }];
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await getUserQuizzes('0x123');

      expect(supabase.from).toHaveBeenCalledWith('questions');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('created_by', '0x123');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });

      expect(result.success).toBe(true);
      expect(result.quizzes).toEqual(mockData);
    });
  });

  describe('exportUserData', () => {
    it('returns an error if walletAddress is empty', async () => {
      const result = await exportUserData('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Wallet address is required for security.');
    });

    it('exports data successfully', async () => {
      const mockQuizzes = [{ id: '1', prompt: 'Q1' }];
      const mockStats = [{ id: 's1', score: 100 }];
      
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockImplementation((field) => {
        if (field === 'created_by') return Promise.resolve({ data: mockQuizzes, error: null });
        if (field === 'wallet_address') return Promise.resolve({ data: mockStats, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      });

      const result = await exportUserData('0x123');

      expect(supabase.from).toHaveBeenCalledWith('questions');
      expect(supabase.from).toHaveBeenCalledWith('quiz_results');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.quizzes).toEqual(mockQuizzes);
      expect(result.data?.stats).toEqual(mockStats);
      expect(result.data?.walletAddress).toBe('0x123');
    });
  });
});
