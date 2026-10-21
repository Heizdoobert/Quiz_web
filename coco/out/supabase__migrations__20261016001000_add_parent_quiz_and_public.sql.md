# supabase/migrations/20261016001000_add_parent_quiz_and_public.sql
lines:6 exports:
---
-- Add nullable parent_quiz_id for remix lineage and public flag for marketplace visibility
ALTER TABLE public.quizzes
  ADD COLUMN parent_quiz_id UUID REFERENCES public.quizzes(id) DEFAULT NULL;

ALTER TABLE public.quizzes
  ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;
