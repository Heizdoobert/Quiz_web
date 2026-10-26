# lib/api/ghost_duel.ts
lines:174 exports:QuizId,GhostId,Pin,Quiz,GhostAttempt,CreateQuizInput,SubmitGhostInput,RemixGhostInput,CreateQuizSchema,SubmitGhostSchema,RemixGhostSchema,createQuiz,submitGhost,getGhostByPin,remixGhost,listPublicQuizzes
---
// Ghost Duel API service layer
// This file implements the core business logic for the Ghost‑Duel + Remix feature.
// It follows the contract defined in ghost_duel_api_design.md.

import { findGhostAttemptByPin, insertQuiz, insertGhostAttempt, getGhostAttemptByPin, selectPublicQuizzes } from '@/lib/db/quiz/ghost-duel';
// Database type not needed for API slice
import { z } from 'zod';

// ---------- Type Definitions (mirroring design) ----------
export type QuizId = string & { readonly __brand: 'QuizId' };
export type GhostId = string & { readonly __brand: 'GhostId' };
export type Pin = string & { readonly __brand: 'Pin' };

export interface Quiz {
  id: QuizId;
  title: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  createdBy: string;
  parentQuizId?: QuizId;
}

export interface GhostAttempt {
  id: GhostId;
  quizId: QuizId;
  pin: Pin;
  answers: Record<string, string>;
  createdAt: string;
  expiresAt: string;
}

export interface CreateQuizInput {
  title: string;
  description?: string;
  isPublic?: boolean;
  parentQuizId?: QuizId;
}

export interface SubmitGhostInput {
