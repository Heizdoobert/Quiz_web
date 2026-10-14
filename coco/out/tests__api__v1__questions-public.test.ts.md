# tests/api/v1/questions-public.test.ts
lines:350 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getRandomQuestion } from '@/app/api/v1/questions/random/route';
import { GET as getQuestionCountRoute } from '@/app/api/v1/questions/count/route';
import { GET as getQuestionById } from '@/app/api/v1/questions/[id]/route';
import { GET as getTopicsRoute } from '@/app/api/v1/topics/route';
import { GET as getTopicQuestionsRoute } from '@/app/api/v1/topics/[topic]/questions/route';
import { GET as searchRoute } from '@/app/api/v1/search/route';

import {
  fetchRandomQuestion,
  getQuestionCount,
  getPublicQuestion,
  getTopics,
} from '@/lib/actions/question-actions';
import {
  searchQuestions,
  getTopicQuestions,
} from '@/lib/actions/discovery-actions';

vi.mock('@/lib/actions/question-actions', () => ({
  fetchRandomQuestion: vi.fn(),
  getQuestionCount: vi.fn(),
  getPublicQuestion: vi.fn(),
  getTopics: vi.fn(),
}));

vi.mock('@/lib/actions/discovery-actions', () => ({
  searchQuestions: vi.fn(),
  getTopicQuestions: vi.fn(),
}));

function get(url: string) {
  return new NextRequest(url, { method: 'GET' });
}

beforeEach(() => {
  vi.resetAllMocks();
});

