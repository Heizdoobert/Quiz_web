import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateQuestion, fetchRandomQuestion, getPublicQuestion } from '../lib/actions/question-actions';
import { getSessionAccount } from '../lib/services/session';
import { supabase } from '../lib/supabase/supabase';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';

// Hoist mock setup for GoogleGenAI
const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return {
      models: {
        generateContent: mockGenerateContent,
      },
    };
  }),
}));

vi.mock('../lib/services/session', () => ({
  getSessionAccount: vi.fn(),
}));

vi.mock('../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../lib/supabase/supabase-admin', () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
  },
}));

vi.mock('../lib/supabase/supabase', () => ({ supabase: { from: vi.fn() } }));

// Chainable stub for supabase.from('questions'). Like PostgREST, it returns only the
// columns named in select(), so a test fails if the query stops asking for a column.
function stubQuestionsTable(row: Record<string, unknown>) {
  let columns: string[] = [];
  const pick = () => Object.fromEntries(columns.map((c) => [c, row[c]]));
  const chain: Record<string, unknown> = {};
  for (const m of ['eq', 'is', 'not', 'ilike', 'limit']) chain[m] = () => chain;
  chain.select = (list: string) => {
    columns = list.split(',').map((c) => c.trim());
    return chain;
  };
  chain.single = () => Promise.resolve({ data: pick(), error: null });
  chain.then = (resolve: (val: unknown) => unknown) => resolve({ data: [pick()], error: null });
  vi.mocked(supabase.from).mockReturnValue(chain as never);
}

describe('generateQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated users', async () => {
    // Arrange
    vi.mocked(getSessionAccount).mockResolvedValue(null);

    // Act
    const result = await generateQuestion('Bitcoin');

    // Assert
    expect(result).toEqual({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Sign in to generate questions.' },
    });
  });

  it('returns SERVER_ERROR if database rpc fails', async () => {
    // Arrange
    vi.mocked(getSessionAccount).mockResolvedValue({ id: 'user-1' } as never);
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: null, error: new Error('DB Error') } as never);

    // Act
    const result = await generateQuestion('Bitcoin');

    // Assert
    expect(result).toEqual({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate question.' },
    });
  });

  it('enforces a rate limit of 3 generations per day', async () => {
    // Arrange
    vi.mocked(getSessionAccount).mockResolvedValue({ id: 'user-1' } as never);
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: 4, error: null } as never);

    // Act
    const result = await generateQuestion('Bitcoin');

    // Assert
    expect(result).toEqual({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'You have reached the limit of 3 AI generations per day.' },
    });
  });

  it('generates a question successfully when under rate limit', async () => {
    // Arrange
    vi.mocked(getSessionAccount).mockResolvedValue({ id: 'user-1' } as never);
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: 1, error: null } as never);
    
    const fakeAiResponse = {
      prompt: 'Who created Bitcoin?',
      options: ['Satoshi Nakamoto', 'Vitalik Buterin', 'Elon Musk', 'Charlie Lee'],
      correctIndex: 0,
      explanation: 'Satoshi Nakamoto is the pseudonymous creator.'
    };
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(fakeAiResponse)
    });

    // Act
    const result = await generateQuestion('Bitcoin');

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(fakeAiResponse);
    }
    
    // Verify AI was called with the topic
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.contents).toContain('Bitcoin');
  });

  it('returns SERVER_ERROR if the AI throws an error', async () => {
    // Arrange
    vi.mocked(getSessionAccount).mockResolvedValue({ id: 'user-1' } as never);
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: 2, error: null } as never);
    mockGenerateContent.mockRejectedValue(new Error('AI is down'));

    // Act
    const result = await generateQuestion('Bitcoin');

    // Assert
    expect(result).toEqual({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate question.' },
    });
  });
});

// Since the Web2 pivot, accounts have no wallet: the bridge trigger leaves the wallet
// column questions.created_by NULL and only created_by_user names the author.
describe('question author marker', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const base = { id, category: 'Science', prompt: 'Q?', options: ['a', 'b'], status: 'verified' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchRandomQuestion marks a question added by an email account as community', async () => {
    stubQuestionsTable({ ...base, created_by: null, created_by_user: 'account-1' });

    const question = await fetchRandomQuestion();

    expect(question?.created_by).toBe('account-1');
  });

  it('getPublicQuestion marks a question added by an email account as community', async () => {
    stubQuestionsTable({ ...base, created_by: null, created_by_user: 'account-1' });

    const question = await getPublicQuestion(id);

    expect(question?.created_by).toBe('account-1');
  });

  it('leaves a core question without an author', async () => {
    stubQuestionsTable({ ...base, created_by: null, created_by_user: null });

    const question = await getPublicQuestion(id);

    expect(question?.created_by).toBeNull();
  });
});
