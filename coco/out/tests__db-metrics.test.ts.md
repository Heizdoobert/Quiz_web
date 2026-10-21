# tests/db-metrics.test.ts
lines:26 exports:
---
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  admin: vi.fn(),
}));

import { admin } from '@/lib/db/client';
import { getSystemCounts } from '@/lib/db/metrics';

describe('DB Metrics domain function (TDD)', () => {
  it('queries exact counts for users, questions, and quiz_results', async () => {
    vi.mocked(admin).mockReturnValue({
      from: vi.fn((table: string) => ({
        select: vi.fn().mockResolvedValue({
          count: table === 'users' ? 42 : table === 'questions' ? 100 : 500,
          error: null,
        }),
      })),
    } as unknown as ReturnType<typeof admin>);

    const counts = await getSystemCounts();
    expect(counts.totalUsers).toBe(42);
    expect(counts.totalQuestions).toBe(100);
    expect(counts.totalQuizResults).toBe(500);
  });
});
