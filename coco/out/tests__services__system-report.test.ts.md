# tests/services/system-report.test.ts
lines:117 exports:
---
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  collectSystemMetrics,
  formatSystemReport,
  sendSystemReport,
  type SystemMetrics,
} from '@/lib/services/reporting/system-report';

vi.mock('@/lib/db/questions', () => ({
  ping: vi.fn(),
}));

vi.mock('@/lib/db/metrics', () => ({
  getSystemCounts: vi.fn(),
}));

vi.mock('@/lib/services/api/sendgrid', () => ({
  sendEmail: vi.fn(),
}));

import { ping } from '@/lib/db/questions';
import { getSystemCounts } from '@/lib/db/metrics';
import { sendEmail } from '@/lib/services/api/sendgrid';

describe('System Report Service (TDD)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('collects healthy system metrics with counts when DB responds', async () => {
    vi.mocked(ping).mockResolvedValue(undefined);
    vi.mocked(getSystemCounts).mockResolvedValue({
