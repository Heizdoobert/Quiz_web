# supabase/tests/database/21_stats_readers.test.sql
lines:53 exports:
---
begin;
select plan(5);

insert into topics (slug) values ('general') on conflict (slug) do nothing;

insert into users (id, display_name) values
  ('00000000-0000-4000-8000-0000000000a1', 'lb-a'),
  ('00000000-0000-4000-8000-0000000000a2', 'lb-b'),
  ('00000000-0000-4000-8000-0000000000a3', 'lb-c');
insert into questions (id, prompt, options, correct_index, topic_id)
select ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid, 'reader question ' || g, '["a","b"]'::jsonb, 0, (select id from topics where slug = 'general')
  from generate_series(1, 3) g;

-- lb-a: 3 of 3. lb-b: 2 of 3. lb-c: no answers.
insert into quiz_results (user_id, question_id, answer_index, is_correct, answered_at)
select '00000000-0000-4000-8000-0000000000a1'::uuid, ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid, 0, true, now() + (g || ' seconds')::interval
  from generate_series(1, 3) g;
insert into quiz_results (user_id, question_id, answer_index, is_correct, answered_at)
select '00000000-0000-4000-8000-0000000000a2'::uuid, ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid, 0, g <> 2, now() + (g || ' seconds')::interval
  from generate_series(1, 3) g;
insert into groups (id, name, owner_user) values ('00000000-0000-4000-8000-0000000000f1', 'reader-group', '00000000-0000-4000-8000-0000000000a1');
insert into group_members (group_id, user_id) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a2'),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a3');

select results_eq(
  $$ select display_name, score, accuracy from get_global_leaderboard(10) $$,
  $$ values ('lb-a'::text, 3, 100), ('lb-b'::text, 2, 67) $$,
  'global leaderboard ranks by score then accuracy and omits players with no answers');

select results_eq(
  $$ select display_name, score, accuracy from get_group_leaderboard('00000000-0000-4000-8000-0000000000f1', 10) $$,
  $$ values ('lb-a'::text, 3, 100), ('lb-b'::text, 2, 67), ('lb-c'::text, 0, 0) $$,
  'group leaderboard lists members with no answers as 0 and 0');

select results_eq(
  $$ select display_name, score from get_global_leaderboard(1, 1) $$,
  $$ values ('lb-b'::text, 2) $$,
  'offset pages the leaderboard');
