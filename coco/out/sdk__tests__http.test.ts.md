# sdk/tests/http.test.ts
lines:474 exports:
---
import { describe, it, expect, vi } from 'vitest';
import { QuickQuizClient, HttpClient } from '../src/client';
import { QuickQuizError } from '../src/errors';

describe('SDK HTTP Client & Error Handling', () => {
  const baseUrl = 'https://api.quickquiz.app';

  describe('Authorization header handling', () => {
    it('attaches Authorization: Bearer <token> when token is set in options', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: { user: 'alice' } }),
      });

      const client = new QuickQuizClient({
        baseUrl,
        token: 'test-token-123',
        fetch: mockFetch as unknown as typeof fetch,
      });

      const result = await client.request('/v1/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.quickquiz.app/v1/test');
      expect(init?.headers?.['Authorization']).toBe('Bearer test-token-123');
      expect(result).toEqual({ user: 'alice' });
    });

    it('omits Authorization header when token is null or undefined', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: 'ok' }),
      });

      const clientWithoutToken = new QuickQuizClient({
        baseUrl,
        fetch: mockFetch as unknown as typeof fetch,
