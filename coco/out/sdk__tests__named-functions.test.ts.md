# sdk/tests/named-functions.test.ts
lines:387 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  QuickQuizClient,
  createClient,
  setDefaultClient,
  getDefaultClient,
  // Auth
  signUp,
  signIn,
  signInWithGoogle,
  requestEmailCode,
  verifyEmailCode,
  getSession,
  session,
  signOut,
  // Questions
  getRandomQuestion,
  randomQuestion,
  getQuestionById,
  getQuestion,
  getQuestionCount,
  countQuestions,
  createQuestion,
  generateQuestion,
  disputeQuestion,
  get5050EliminatedIndices,
  fiftyFifty,
  // Quiz
  submitQuizAnswer,
  submitAnswer,
  getAnswerHistory,
  getQuizHistory,
  getUserStats,
  getQuizStats,
  // Leaderboard
  getGlobalLeaderboard,
  globalLeaderboard,
  getGroupLeaderboard,
  groupLeaderboard,
  // Groups
