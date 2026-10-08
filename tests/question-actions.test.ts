import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateQuestion } from '../lib/actions/question-actions';
import { getSessionAccount } from '../lib/services/session';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';

// Hoist mock setup for GoogleGenAI
const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return {
      models: {
        generateContent: mockGenerateContent,
      },
    };
  }),
}));

vi.mock('../lib/services/session', () => ({
  getSessionAccount: vi.fn(),
}));

vi.mock('../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../lib/supabase/supabase-admin', () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
  },
}));

describe('generateQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated users', async () => {
    // Arrange
    vi.mocked(getSessionAccount).mockResolvedValue(null);

    // Act
    const result = await generateQuestion('Bitcoin');

    // Assert
    expect(result).toEqual({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Sign in to generate questions.' },
    });
  });

  it('returns SERVER_ERROR if database rpc fails', async () => {
    // Arrange
    vi.mocked(getSessionAccount).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: null, error: new Error('DB Error') } as any);

    // Act
    const result = await generateQuestion('Bitcoin');

    // Assert
    expect(result).toEqual({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate question.' },
    });
  });

  it('enforces a rate limit of 3 generations per day', async () => {
    // Arrange
    vi.mocked(getSessionAccount).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: 4, error: null } as any);

    // Act
    const result = await generateQuestion('Bitcoin');

    // Assert
    expect(result).toEqual({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'You have reached the limit of 3 AI generations per day.' },
    });
  });

  it('generates a question successfully when under rate limit', async () => {
    // Arrange
    vi.mocked(getSessionAccount).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: 1, error: null } as any);
    
    const fakeAiResponse = {
      prompt: 'Who created Bitcoin?',
      options: ['Satoshi Nakamoto', 'Vitalik Buterin', 'Elon Musk', 'Charlie Lee'],
      correctIndex: 0,
      explanation: 'Satoshi Nakamoto is the pseudonymous creator.'
    };
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(fakeAiResponse)
    });

    // Act
    const result = await generateQuestion('Bitcoin');

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(fakeAiResponse);
    }
    
    // Verify AI was called with the topic
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.contents).toContain('Bitcoin');
  });

  it('returns SERVER_ERROR if the AI throws an error', async () => {
    // Arrange
    vi.mocked(getSessionAccount).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: 2, error: null } as any);
    mockGenerateContent.mockRejectedValue(new Error('AI is down'));

    // Act
    const result = await generateQuestion('Bitcoin');

    // Assert
    expect(result).toEqual({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate question.' },
    });
  });
});
