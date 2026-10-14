# tests/sdk-integration.test.ts
lines:429 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Import the SDK from source so type-check does not depend on a prior build
import {
  QuickQuizClient,
  QuickQuizError,
  AuthResource,
  QuestionsResource,
  QuizResource,
  LeaderboardResource,
  CommunityResource,
  GroupsResource,
  DiscoveryResource,
  ProfileResource,
  type ClientQuestion,
  type AnswerSubmissionResult,
  type AuthResult,
  type AuthSession,
} from '../sdk/src';

import {
  createTokenVerifier,
  getBearerToken,
  withQuickQuizAuth,
  quickQuizAuth,
} from '../sdk/src/server';

// Route handlers under test
import { POST as signupRoute } from '@/app/api/v1/auth/signup/route';
import { POST as signinRoute } from '@/app/api/v1/auth/signin/route';
import { GET as sessionRoute } from '@/app/api/v1/auth/session/route';
import { POST as signoutRoute } from '@/app/api/v1/auth/signout/route';
import { GET as getRandomQuestionRoute } from '@/app/api/v1/questions/random/route';
import { GET as getQuestionCountRoute } from '@/app/api/v1/questions/count/route';
import { GET as getQuestionByIdRoute } from '@/app/api/v1/questions/[id]/route';
import { POST as submitAnswerRoute } from '@/app/api/v1/quiz/answer/route';

// Underlying services mocked for handler execution
import { signUpAccount, signInAccount } from '@/lib/services/credentials';
