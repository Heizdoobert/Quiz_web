# supabase/tests/database/50_achievements.test.sql
lines:35 exports:
---
begin;
select plan(8);

insert into topics (slug) values ('general') on conflict (slug) do nothing;
insert into users (id, display_name) values ('00000000-0000-4000-8000-0000000000a1', 'ach-a');
insert into questions (id, prompt, options, correct_index, topic_id)
select ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid, 'achievement question ' || g, '["a","b"]'::jsonb, 0,
       (select id from topics where slug = 'general')
  from generate_series(1, 5) g;

select is((select count(*)::int from achievements), 6, 'the six seed achievements exist');
select is_empty($$ select award_achievements('00000000-0000-4000-8000-0000000000a1') $$, 'a player with no answers unlocks nothing');

-- One correct answer unlocks first_answer.
insert into quiz_results (user_id, question_id, answer_index, is_correct, answered_at)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000101', 0, true, now() + interval '1 second');
select results_eq($$ select award_achievements('00000000-0000-4000-8000-0000000000a1') $$, $$ values ('first_answer'::text) $$, 'the first answer unlocks first_answer');
select is_empty($$ select award_achievements('00000000-0000-4000-8000-0000000000a1') $$, 'calling again returns no new unlocks');

-- Four more correct answers reach a best streak of 5.
insert into quiz_results (user_id, question_id, answer_index, is_correct, answered_at)
select '00000000-0000-4000-8000-0000000000a1'::uuid, ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid, 0, true, now() + (g || ' seconds')::interval
  from generate_series(2, 5) g;
select results_eq($$ select award_achievements('00000000-0000-4000-8000-0000000000a1') $$, $$ values ('streak_5'::text) $$, 'a streak of 5 unlocks streak_5 only');
select is((select count(*)::int from user_achievements where user_id = '00000000-0000-4000-8000-0000000000a1'), 2, 'two unlocks are stored');

-- A finished daily attempt unlocks first_daily.
insert into daily_challenges (challenge_date) values ('2026-12-01');
insert into daily_attempts (user_id, challenge_date, finished_at) values ('00000000-0000-4000-8000-0000000000a1', '2026-12-01', now());
select results_eq($$ select award_achievements('00000000-0000-4000-8000-0000000000a1') $$, $$ values ('first_daily'::text) $$, 'a finished daily unlocks first_daily');

select is(has_function_privilege('anon', 'award_achievements(uuid)', 'execute'), false, 'only the server awards achievements');

select * from finish();
rollback;
