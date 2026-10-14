# tests/api/v1/community-groups-profile.test.ts
lines:777 exports:
---
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

import { GET as getUserGroupsRoute, POST as createGroupRoute } from '@/app/api/v1/groups/route';
import { POST as joinGroupRoute } from '@/app/api/v1/groups/[id]/join/route';
import { POST as leaveGroupRoute } from '@/app/api/v1/groups/[id]/leave/route';
import { POST as rateQuestionRoute } from '@/app/api/v1/questions/[id]/rate/route';
import { POST as addCommentRoute } from '@/app/api/v1/questions/[id]/comment/route';
import { DELETE as deleteCommentRoute } from '@/app/api/v1/comments/[id]/route';
import { POST as resolveSuggestionRoute } from '@/app/api/v1/suggestions/[id]/resolve/route';
import { GET as getDiscussionRoute } from '@/app/api/v1/questions/[id]/discussion/route';
import { GET as getSuggestionsRoute } from '@/app/api/v1/suggestions/route';
import { GET as getUserQuizzesRoute } from '@/app/api/v1/profile/quizzes/route';
import { GET as exportUserDataRoute } from '@/app/api/v1/profile/export/route';
import { GET as getAnalyticsRoute } from '@/app/api/v1/profile/analytics/route';

import { createGroup, joinGroup, leaveGroup, getUserGroups } from '@/lib/actions/group-actions';
import {
  rateQuestion,
  addComment,
  deleteComment,
  resolveSuggestion,
  getQuestionDiscussion,
  getSuggestionsForAuthor,
} from '@/lib/actions/community-actions';
import {
  getUserQuizzes,
  exportUserData,
  getQuestionAnalytics,
} from '@/lib/actions/profile-actions';
import { issueMobileAuthToken } from '@/lib/services/mobile-auth';

vi.mock('@/lib/actions/group-actions', () => ({
  createGroup: vi.fn(),
  joinGroup: vi.fn(),
  leaveGroup: vi.fn(),
  getUserGroups: vi.fn(),
}));

vi.mock('@/lib/actions/community-actions', () => ({
