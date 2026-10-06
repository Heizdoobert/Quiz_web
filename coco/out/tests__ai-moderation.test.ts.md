# tests/ai-moderation.test.ts
lines:70 exports:
---
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
