import { describe, it, expect, vi, beforeEach } from 'vitest';
import { moderateContent } from '../lib/services/ai-moderation';

const { mockGenerateContent } = vi.hoisted(() => ({ mockGenerateContent: vi.fn() }));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function() { return {
    models: {
      generateContent: mockGenerateContent,
    },
  }; }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('moderateContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns parsed moderation result when content is safe', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ isSafe: true, reason: '' }),
    });

    const promise = moderateContent('What is 2+2?', ['1', '2', '3', '4']);
    const result = await promise;

    expect(result).toEqual({ isSafe: true, reason: '' });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);

    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.model).toBe('gemini-2.5-flash');
    expect(callArgs.config.responseMimeType).toBe('application/json');
    expect(callArgs.config.temperature).toBe(0.1);
    expect(callArgs.config.abortSignal).toBeInstanceOf(AbortSignal);
    expect(callArgs.config.abortSignal.aborted).toBe(false);
  });

  it('returns parsed moderation result when content is unsafe', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ isSafe: false, reason: 'Offensive language' }),
    });

    const result = await moderateContent('Bad question', ['a', 'b', 'c', 'd']);
    expect(result).toEqual({ isSafe: false, reason: 'Offensive language' });
  });

  it('fails open (isSafe: true) when response text is empty', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '',
    });

    const result = await moderateContent('Empty test', ['a']);
    expect(result).toEqual({ isSafe: true });
  });

  it('fails open (isSafe: true) when generateContent throws an error', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API Error'));

    const result = await moderateContent('Error test', ['a']);
    expect(result).toEqual({ isSafe: true });
  });
});
