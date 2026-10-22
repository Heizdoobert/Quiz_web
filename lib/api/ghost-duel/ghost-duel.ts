// Ghost Duel API service layer
// This file implements the core business logic for the Ghost‑Duel + Remix feature.
// It follows the contract defined in ghost_duel_api_design.md.

import { z } from 'zod';
import {
  findGhostAttemptByPin,
  insertQuiz,
  insertGhostAttempt,
  getGhostAttemptByPin,
  selectPublicQuizzes,
} from '@/lib/db/ghost-duel';

// ---------- Type Definitions (mirroring design) ----------
export type QuizId = string & { readonly __brand: 'QuizId' };
export type GhostId = string & { readonly __brand: 'GhostId' };
export type Pin = string & { readonly __brand: 'Pin' };

export interface GhostQuiz {
  id: QuizId;
  title: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  createdBy: string;
  parentQuizId?: QuizId;
}

export type Quiz = GhostQuiz;

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
  answers: Record<string, string>;
}

export interface RemixGhostInput {
  pin: Pin;
  answers: Record<string, string>;
}

// ---------- Validation Schemas ----------
export const CreateQuizSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  isPublic: z.boolean().optional(),
  parentQuizId: z.string().uuid().optional(),
});

export const SubmitGhostSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

export const RemixGhostSchema = z.object({
  pin: z.string().length(6).regex(/^\d{6}$/),
  answers: z.record(z.string(), z.string()),
});

// ---------- Helper Functions ----------
/** Generate a globally unique 6‑digit numeric PIN */
async function generateUniquePin(): Promise<Pin> {
  // Simple loop; in production use a DB unique constraint to guarantee uniqueness.
  while (true) {
    const pin = Math.floor(100000 + Math.random() * 900000).toString() as Pin;
    const { data, error } = await findGhostAttemptByPin(pin);
    if (!error && !data) return pin;
  }
}

/** Compute expiration 30 days from now (UTC) */
function computeExpiresAt(): string {
  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + 30);
  return expires.toISOString();
}

// ---------- Service Implementations ----------
export async function createQuiz(
  input: CreateQuizInput,
  userId: string,
  _idempotencyKey?: string
) {
  // Idempotency handling (simplified): store key in a separate table "idempotent_quiz".
  // For now we just insert and rely on unique constraint on (userId, title) as a placeholder.
  const { data, error } = await insertQuiz({
    title: input.title,
    description: input.description,
    is_public: input.isPublic ?? false,
    created_by: userId,
    parent_quiz_id: input.parentQuizId ?? null,
  });
  if (error) throw error;
  return data as Quiz;
}

export async function submitGhost(
  quizId: QuizId,
  input: SubmitGhostInput,
  ip?: string
) {
  const pin = await generateUniquePin();
  const expiresAt = computeExpiresAt();
  const { data, error } = await insertGhostAttempt({
    quiz_id: quizId,
    pin,
    answers: input.answers,
    expires_at: expiresAt,
    ip_address: ip ?? null,
  });
  if (error) throw error;
  return { ghostId: data.id as GhostId, pin, expiresAt };
}

export async function getGhostByPin(quizId: QuizId, pin: Pin) {
  const { data, error } = await getGhostAttemptByPin(quizId, pin);
  if (error) throw error;
  return data as GhostAttempt;
}

export async function remixGhost(
  quizId: QuizId,
  input: RemixGhostInput,
  _userId: string,
  _idempotencyKey?: string
) {
  // Find original ghost
  const original = await getGhostByPin(quizId, input.pin);
  // Merge answers (original + new)
  const mergedAnswers = { ...original.answers, ...input.answers };
  // Store new ghost attempt
  const result = await submitGhost(quizId, { answers: mergedAnswers });
  return result; // contains new ghostId and pin
}

export async function listPublicQuizzes(page = 1, pageSize = 20) {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await selectPublicQuizzes(from, from + pageSize - 1);
  if (error) throw error;
  const totalItems = count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  return {
    data: data as Quiz[],
    pagination: { page, pageSize, totalItems, totalPages },
  };
}
