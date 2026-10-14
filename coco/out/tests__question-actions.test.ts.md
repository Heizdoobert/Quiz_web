# tests/question-actions.test.ts
lines:187 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateQuestion, fetchRandomQuestion, getPublicQuestion } from '../lib/actions/question-actions';
import { getSessionAccount } from '../lib/services/session';
import { supabase } from '../lib/sdk/supabase';
import { supabaseAdmin } from '../lib/sdk/supabase-admin';

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

vi.mock('../lib/sdk/supabase-admin', () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
  },
}));

vi.mock('../lib/sdk/supabase', () => ({ supabase: { from: vi.fn() } }));
