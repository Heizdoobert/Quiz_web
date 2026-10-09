# tests/question-actions.test.ts
lines:133 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateQuestion } from '../lib/actions/question-actions';
import { getSessionAccount } from '../lib/services/session';
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

describe('generateQuestion', () => {
  beforeEach(() => {
