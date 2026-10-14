# tests/sdk-gate.test.ts
lines:103 exports:
---
import { describe, it, expect, vi } from 'vitest';
import { getSdk } from '@/lib/sdk';
import { getSiteUrl } from '@/lib/utils/site-url';

describe('SDK Gate (lib/sdk.ts)', () => {
  it('resolves default baseUrl to ${getSiteUrl()}/api', async () => {
    const expectedBaseUrl = `${getSiteUrl()}/api`;
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = getSdk({ fetch: mockFetch });

    expect((client.http as unknown as { baseUrl: string }).baseUrl).toBe(expectedBaseUrl);

    await client.request('/status');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [requestUrl] = mockFetch.mock.calls[0];
    expect(requestUrl).toBe(`${expectedBaseUrl}/status`);
  });

  it('honors caller-provided baseUrl when supplied', async () => {
    const customBase = 'https://custom-api.example.com/api';
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = getSdk({ baseUrl: customBase, fetch: mockFetch });

    expect((client.http as unknown as { baseUrl: string }).baseUrl).toBe(customBase);

    await client.request('/ping');

