# sdk/tests/resources.test.ts
lines:666 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  QuickQuizClient,
  AuthResource,
  QuestionsResource,
  QuizResource,
  LeaderboardResource,
  CommunityResource,
  GroupsResource,
  DiscoveryResource,
  ProfileResource,
} from '../src';

describe('SDK Resource Modules', () => {
  const baseUrl = 'https://api.quickquiz.app';
  let mockFetch: ReturnType<typeof vi.fn>;
  let client: QuickQuizClient;

  function mockResponse(data: unknown, status = 200) {
    mockFetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify({ success: true, data }),
    });
  }

  beforeEach(() => {
    mockFetch = vi.fn();
    client = new QuickQuizClient({
      baseUrl,
      fetch: mockFetch as unknown as typeof fetch,
    });
  });

  describe('QuickQuizClient resource wiring & exports', () => {
    it('instantiates and exposes all 8 resources', () => {
      expect(client.auth).toBeInstanceOf(AuthResource);
      expect(client.questions).toBeInstanceOf(QuestionsResource);
      expect(client.quiz).toBeInstanceOf(QuizResource);
      expect(client.leaderboard).toBeInstanceOf(LeaderboardResource);
