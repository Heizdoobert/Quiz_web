# supabase/tests/database/40_daily_challenge.test.sql
lines:53 exports:
---
begin;
select plan(11);

insert into topics (slug) values ('general') on conflict (slug) do nothing;
insert into users (id, display_name) values
  ('00000000-0000-4000-8000-0000000000a1', 'day-a'),
  ('00000000-0000-4000-8000-0000000000a2', 'day-b');
insert into questions (id, prompt, options, correct_index, topic_id)
select ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid, 'daily question ' || g, '["a","b"]'::jsonb, 0,
       (select id from topics where slug = 'general')
  from generate_series(1, 12) g;
insert into questions (id, prompt, options, correct_index, status, topic_id)
values ('00000000-0000-4000-8000-000000000199', 'rejected daily question', '["a","b"]', 0, 'rejected', (select id from topics where slug = 'general'));

select is(pick_daily_challenge('2026-11-20', 10), 10, 'picks ten questions');
select is(pick_daily_challenge('2026-11-20', 10), 0, 'a second pick for the same day changes nothing');
select is((select count(*)::int from daily_challenge_questions where challenge_date = '2026-11-20' and question_id = '00000000-0000-4000-8000-000000000199'), 0, 'a rejected question is never picked');
select throws_ok($$ select pick_daily_challenge('2026-11-21', 21) $$, 'P0001', null, 'at most 20 questions');

-- Attempts: one per player per day.
insert into daily_attempts (id, user_id, challenge_date, started_at, finished_at) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', '2026-11-20', '2026-11-20 10:00:00+00', '2026-11-20 10:01:30+00'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000a2', '2026-11-20', '2026-11-20 11:00:00+00', '2026-11-20 11:00:40+00');
select throws_ok(
  $$ insert into daily_attempts (user_id, challenge_date) values ('00000000-0000-4000-8000-0000000000a1', '2026-11-20') $$,
  '23505', null, 'one attempt per player per day');

-- Answers: only questions of that day's challenge, and only against that day's attempt.
select throws_ok(
  $$ insert into daily_attempt_answers (attempt_id, challenge_date, question_id, answer_index, is_correct)
     values ('00000000-0000-4000-8000-0000000000b1', '2026-11-20', '00000000-0000-4000-8000-000000000199', 0, true) $$,
  '23503', null, 'an answer to a question outside the challenge is refused');
select throws_ok(
  $$ insert into daily_attempt_answers (attempt_id, challenge_date, question_id, answer_index, is_correct)
     select '00000000-0000-4000-8000-0000000000b1', '2026-11-19', question_id, 0, true
       from daily_challenge_questions where challenge_date = '2026-11-20' limit 1 $$,
  '23503', null, 'an answer attached to another day is refused');

-- Scoring: a1 gets 2 right in 90s, a2 gets 2 right in 40s, so a2 ranks first on time.
insert into daily_attempt_answers (attempt_id, challenge_date, question_id, answer_index, is_correct)
