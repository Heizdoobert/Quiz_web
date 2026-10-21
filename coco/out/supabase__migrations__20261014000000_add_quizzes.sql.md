# supabase/migrations/20261014000000_add_quizzes.sql
lines:36 exports:
---
-- Migration to add quizzes and quiz_questions tables with RLS policies
-- Timestamp: 2026-10-14 00:00:00 UTC
BEGIN;
-- Create quizzes table
CREATE TABLE public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Create join table linking quizzes to questions with explicit order
CREATE TABLE public.quiz_questions (
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    order_index INT NOT NULL,
    PRIMARY KEY (quiz_id, question_id)
);
-- RLS policies for quizzes
CREATE POLICY "Allow select published quizzes" ON public.quizzes
    FOR SELECT USING (is_published = TRUE);
CREATE POLICY "Allow owners to manage their quizzes" ON public.quizzes
    FOR ALL USING (auth.uid() = created_by);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
-- RLS policies for quiz_questions (only owners can read/write linked data)
CREATE POLICY "Allow owners to select quiz_questions" ON public.quiz_questions
    FOR SELECT USING (auth.uid() = (
        SELECT created_by FROM public.quizzes WHERE id = quiz_id
    ));
CREATE POLICY "Allow owners to modify quiz_questions" ON public.quiz_questions
    FOR ALL USING (auth.uid() = (
        SELECT created_by FROM public.quizzes WHERE id = quiz_id
    ));
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
COMMIT;
