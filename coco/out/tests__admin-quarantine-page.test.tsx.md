# tests/admin-quarantine-page.test.tsx
lines:110 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminQuarantinePage from '@/app/admin/quarantine/page';
import QuarantineList from '@/components/admin/QuarantineList';
import { authorize } from '@/lib/services/authorize';
import { listQuarantinedQuestions } from '@/lib/services/moderation';
import { listQuarantineAction, resolveQuarantineAction } from '@/lib/actions/admin-actions';
import type { QuarantinedQuestion } from '@/lib/db/questions';

vi.mock('@/lib/services/authorize', () => ({ authorize: vi.fn() }));
vi.mock('@/lib/services/moderation', () => ({ listQuarantinedQuestions: vi.fn() }));
vi.mock('@/lib/actions/admin-actions', () => ({ listQuarantineAction: vi.fn(), resolveQuarantineAction: vi.fn() }));

const q = (id: string, prompt: string): QuarantinedQuestion => ({
  id,
  category: 'General',
  prompt,
  options: ['Red', 'Blue'],
  correct_index: 1,
  explanation: 'Because.',
  dispute_count: 3,
  created_at: '2026-10-01',
  disputes: [{ id: `${id}-d`, reason: 'wrong answer', created_at: '2026-10-02' }],
});
const Q1 = q('q1', 'Sky colour?');
const Q2 = q('q2', 'Grass colour?');
const allow = { success: true, data: { account: { id: 'm' }, role: 'moderator' } } as const;

beforeEach(() => {
  vi.mocked(authorize).mockReset();
  vi.mocked(listQuarantinedQuestions).mockReset();
  vi.mocked(listQuarantineAction).mockReset();
  vi.mocked(resolveQuarantineAction).mockReset();
});

describe('AdminQuarantinePage', () => {
  it('denies a user and never reads the queue (the answer key stays unfetched)', async () => {
    vi.mocked(authorize).mockResolvedValue({ success: false, error: { code: 'NOT_ALLOWED', message: 'no' } });
    render(await AdminQuarantinePage());
    expect(screen.getByRole('alert').textContent).toContain('No access');
