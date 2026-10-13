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
    expect(listQuarantinedQuestions).not.toHaveBeenCalled();
    expect(authorize).toHaveBeenCalledWith('disputes.resolve');
  });

  it('shows the queue with the answer marked and the dispute reasons', async () => {
    vi.mocked(authorize).mockResolvedValue(allow);
    vi.mocked(listQuarantinedQuestions).mockResolvedValue({ success: true, data: { questions: [Q1], limit: 20, offset: 0 } });
    render(await AdminQuarantinePage());
    expect(screen.getByText('Sky colour?')).toBeTruthy();
    expect(screen.getByText('(correct)').parentElement?.textContent).toContain('Blue');
    expect(screen.getByText('wrong answer')).toBeTruthy();
  });

  it('shows the error when the queue fails to load', async () => {
    vi.mocked(authorize).mockResolvedValue(allow);
    vi.mocked(listQuarantinedQuestions).mockResolvedValue({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load the moderation queue.' } });
    render(await AdminQuarantinePage());
    expect(screen.getByRole('alert').textContent).toContain('Failed to load');
  });
});

describe('QuarantineList', () => {
  it('shows an empty state', () => {
    render(<QuarantineList initial={[]} />);
    expect(screen.getByText('Nothing awaiting moderation.')).toBeTruthy();
  });

  it('retires with the note and removes the question', async () => {
    vi.mocked(resolveQuarantineAction).mockResolvedValue({ success: true, data: { questionId: 'q1', outcome: 'retired' } });
    render(<QuarantineList initial={[Q1, Q2]} />);
    fireEvent.change(screen.getAllByLabelText('Note (optional)')[0], { target: { value: 'bad question' } });
    fireEvent.click(screen.getAllByText('Retire')[0]);
    await waitFor(() => expect(screen.queryByText('Sky colour?')).toBeNull());
    expect(resolveQuarantineAction).toHaveBeenCalledWith('q1', 'retire', 'bad question');
    expect(screen.getByText('Grass colour?')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('retired');
  });

  it('restores', async () => {
    vi.mocked(resolveQuarantineAction).mockResolvedValue({ success: true, data: { questionId: 'q1', outcome: 'restored' } });
    render(<QuarantineList initial={[Q1]} />);
    fireEvent.click(screen.getByText('Restore'));
    await waitFor(() => expect(resolveQuarantineAction).toHaveBeenCalledWith('q1', 'restore', ''));
  });

  it('drops a question another moderator already resolved and says so', async () => {
    vi.mocked(resolveQuarantineAction).mockResolvedValue({ success: false, error: { code: 'CONFLICT', message: 'This question is not awaiting moderation.' } });
    render(<QuarantineList initial={[Q1]} />);
    fireEvent.click(screen.getByText('Restore'));
    await waitFor(() => expect(screen.queryByText('Sky colour?')).toBeNull());
    expect(screen.getByRole('status').textContent).toContain('not awaiting moderation');
  });

  it('keeps the question and shows the error on a server failure', async () => {
    vi.mocked(resolveQuarantineAction).mockResolvedValue({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to resolve the dispute.' } });
    render(<QuarantineList initial={[Q1]} />);
    fireEvent.click(screen.getByText('Retire'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Failed to resolve'));
    expect(screen.getByText('Sky colour?')).toBeTruthy();
  });

  it('loads the next page from the number already loaded', async () => {
    const full = Array.from({ length: 20 }, (_, i) => q(`p${i}`, `Prompt ${i}`));
    vi.mocked(listQuarantineAction).mockResolvedValue({ success: true, data: { questions: [Q1], limit: 20, offset: 20 } });
    render(<QuarantineList initial={full} />);
    fireEvent.click(screen.getByText('Load more'));
    await waitFor(() => expect(listQuarantineAction).toHaveBeenCalledWith(20));
    await waitFor(() => expect(screen.queryByText('Load more')).toBeNull());
  });
});
