# tests/topics-db.test.ts
lines:122 exports:
---
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
