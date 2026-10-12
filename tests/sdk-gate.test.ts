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

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [requestUrl] = mockFetch.mock.calls[0];
    expect(requestUrl).toBe(`${customBase}/ping`);
  });

  it('passes auth token to client correctly and sets Authorization header', async () => {
    const mockToken = 'mock-bearer-jwt-12345';
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { authed: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = getSdk({ token: mockToken, fetch: mockFetch });

    expect(client.getToken()).toBe(mockToken);

    await client.request('/me');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    expect(init?.headers?.Authorization).toBe(`Bearer ${mockToken}`);
  });

  it('passes custom fetch through correctly', async () => {
    const customFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { custom: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = getSdk({ fetch: customFetch });
    const result = await client.request<{ custom: boolean }>('/health');

    expect(customFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ custom: true });
  });

  it('passes custom timeout and retries options to client', () => {
    const client = getSdk({
      timeout: 4500,
      retries: 3,
    });

    const httpState = client.http as unknown as { timeout: number; retries: number };
    expect(httpState.timeout).toBe(4500);
    expect(httpState.retries).toBe(3);
  });

  it('returns a fresh client instance per invocation with no mutable global singleton', () => {
    const clientA = getSdk();
    const clientB = getSdk();

    expect(clientA).not.toBe(clientB);
    expect(clientA.http).not.toBe(clientB.http);

    clientA.setToken('token-only-in-client-a');
    expect(clientA.getToken()).toBe('token-only-in-client-a');
    expect(clientB.getToken()).toBeNull();
  });
});
