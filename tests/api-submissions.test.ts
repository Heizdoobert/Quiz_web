import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/submissions/route';
import prisma from '@/lib/prisma';
import { createPublicClient } from 'viem';
import { Prisma } from '@prisma/client';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    leaderboard: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    processedTransaction: {
      create: vi.fn(),
    }
  }
}));

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getTransactionReceipt: vi.fn(),
    })),
  };
});

describe('POST /api/submissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: any) => {
    return new Request('http://localhost/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  it('rejects missing transactionHash', async () => {
    const req = createRequest({});
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(422); // Validation Error
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.message).toBeDefined();
  });

  it('rejects invalid transactionHash format', async () => {
    const req = createRequest({ transactionHash: 'invalid-hash' });
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(422);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate transactionHash (idempotency)', async () => {
    // Simulate Prisma throwing a unique constraint violation when claiming the hash
    (prisma.processedTransaction.create as any).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      })
    );

    const req = createRequest({ transactionHash: '0x1234567890123456789012345678901234567890123456789012345678901234' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409); // Conflict
    expect(data.error.code).toBe('DUPLICATE_SUBMISSION');
  });
});
