import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({ admin: vi.fn(), pub: { rpc: vi.fn(), from: vi.fn() } }));

import { admin, pub } from '@/lib/db/client';
import { insertQuestion, listPublicQuestions, publicQuestion } from '@/lib/db/questions';
import {
  DEFAULT_LOCALE, TOPIC_EMBED, getOrCreateTopicId, resolveTopicId, topicName, withCategory,
} from '@/lib/db/topics';

const TOPIC = { slug: 'defi', topic_translations: [{ locale: 'fr', name: 'Finance' }, { locale: 'en', name: 'DeFi' }] };

beforeEach(() => {
  vi.mocked(admin).mockReset();
  vi.mocked(pub.rpc).mockReset();
  vi.mocked(pub.from).mockReset();
});

describe('topicName', () => {
  it('prefers the asked locale, then the default, then any, then General', () => {
    expect(topicName(TOPIC, 'fr')).toBe('Finance');
    expect(topicName(TOPIC, 'de')).toBe('DeFi');
    expect(topicName({ slug: 'x', topic_translations: [{ locale: 'vi', name: 'Lịch sử' }] }, 'de')).toBe('Lịch sử');
    expect(topicName({ slug: 'x', topic_translations: [] })).toBe('General');
    expect(topicName(null)).toBe('General');
    expect(DEFAULT_LOCALE).toBe('en');
  });
});

describe('withCategory', () => {
  it('replaces the embed with a category string and keeps the other fields', () => {
    expect(withCategory({ id: 'q1', prompt: 'p', topics: TOPIC })).toEqual({ id: 'q1', prompt: 'p', category: 'DeFi' });
  });
});

describe('TOPIC_EMBED', () => {
  it('is the PostgREST embed topicName reads', () => {
    expect(TOPIC_EMBED).toBe('topics(slug, topic_translations(locale, name))');
  });
});

describe('resolveTopicId', () => {
  it('asks resolve_topic with the public key and returns the id', async () => {
    vi.mocked(pub.rpc).mockResolvedValue({ data: 'topic-1', error: null } as never);
    await expect(resolveTopicId('DeFi')).resolves.toBe('topic-1');
    expect(pub.rpc).toHaveBeenCalledWith('resolve_topic', { p_name: 'DeFi' });
  });

  it('returns null for an unknown name', async () => {
    vi.mocked(pub.rpc).mockResolvedValue({ data: null, error: null } as never);
    await expect(resolveTopicId('nope')).resolves.toBeNull();
  });
});

describe('getOrCreateTopicId', () => {
  it('creates or finds the topic with the secret key', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'topic-2', error: null });
    vi.mocked(admin).mockReturnValue({ rpc } as never);
    await expect(getOrCreateTopicId('History')).resolves.toBe('topic-2');
    expect(rpc).toHaveBeenCalledWith('get_or_create_topic', { p_name: 'History' });
  });
});

describe('questions through topics', () => {
  const ROW = { id: 'q1', prompt: 'p', options: ['a', 'b'], created_by_user: null, status: 'verified', topics: TOPIC };

  function chain(rows: unknown) {
    const calls: Array<[string, unknown[]]> = [];
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'not', 'limit', 'single']) {
      c[m] = (...args: unknown[]) => {
        calls.push([m, args]);
        return c;
      };
    }
    c.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null });
    vi.mocked(pub.from).mockReturnValue(c as never);
    return calls;
  }

  it('listPublicQuestions embeds the topic and returns a derived category', async () => {
    const calls = chain([ROW]);
    const rows = await listPublicQuestions({ limit: 5 });
    expect(calls[0][1][0]).toContain(TOPIC_EMBED);
    expect(rows[0]).toMatchObject({ id: 'q1', category: 'DeFi' });
    expect(rows[0]).not.toHaveProperty('topics');
  });

  it('listPublicQuestions filters by topic id resolved from the category name', async () => {
    vi.mocked(pub.rpc).mockResolvedValue({ data: 'topic-1', error: null } as never);
    const calls = chain([ROW]);
    await listPublicQuestions({ category: 'DeFi', limit: 5 });
    expect(calls).toContainEqual(['eq', ['topic_id', 'topic-1']]);
  });

  it('listPublicQuestions returns nothing when the category names no topic', async () => {
    vi.mocked(pub.rpc).mockResolvedValue({ data: null, error: null } as never);
    chain([ROW]);
    await expect(listPublicQuestions({ category: 'nope', limit: 5 })).resolves.toEqual([]);
  });

  it('publicQuestion returns the derived category', async () => {
    chain(ROW);
    await expect(publicQuestion('q1')).resolves.toMatchObject({ id: 'q1', category: 'DeFi' });
  });

  it('insertQuestion stores topic_id and keeps category (authoritative until the contract migration)', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ data: 'topic-9', error: null });
    vi.mocked(admin).mockReturnValue({ rpc, from: vi.fn().mockReturnValue({ insert }) } as never);

    await insertQuestion({
      prompt: 'A long enough prompt', options: ['a', 'b', 'c', 'd'], correct_index: 1, category: 'History',
      explanation: null, created_by_user: 'u1', status: 'verified', dispute_count: 0,
    });

    expect(rpc).toHaveBeenCalledWith('get_or_create_topic', { p_name: 'History' });
    const row = insert.mock.calls[0][0];
    expect(row.topic_id).toBe('topic-9');
    expect(row.category).toBe('History');
  });
});
