-- Migration to add quiz_attempts table for Ghost Duel feature
-- Timestamp: 2026-10-16 00:00:00 UTC
BEGIN;

CREATE TABLE public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    score INT NOT NULL,
    duration_ms INT NOT NULL,
    -- Store per‑question timestamps (ms from start) as JSON array
    timestamps JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (optional, keep it simple for now)
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Rollback
-- DROP TABLE public.quiz_attempts;
