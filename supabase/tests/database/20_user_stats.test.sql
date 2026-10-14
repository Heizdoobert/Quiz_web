begin;
select plan(9);

insert into topics (slug) values ('general') on conflict (slug) do nothing;

insert into users (id, display_name) values ('00000000-0000-4000-8000-0000000000a1', 'stats-a');
insert into questions (id, prompt, options, correct_index, topic_id)
select ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid, 'stats question ' || g, '["a","b"]'::jsonb, 0, (select id from topics where slug = 'general')
  from generate_series(1, 7) g;

select has_table('user_stats', 'user_stats exists');

-- Answers 1..6: right, right, wrong, right, right, right. answered_at is explicit and rising
-- because now() is constant inside a test transaction.
insert into quiz_results (user_id, question_id, answer_index, is_correct, answered_at)
select '00000000-0000-4000-8000-0000000000a1'::uuid,
       ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid,
       0, g <> 3, now() + (g || ' seconds')::interval
  from generate_series(1, 6) g;

select results_eq(
  $$ select total_answered, correct_count, streak, best_streak from user_stats where user_id = '00000000-0000-4000-8000-0000000000a1' $$,
  $$ values (6, 5, 3, 3) $$,
  'the trigger builds total, correct, streak and best streak');

insert into quiz_results (user_id, question_id, answer_index, is_correct, answered_at)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000107', 1, false, now() + interval '7 seconds');

select results_eq(
  $$ select total_answered, correct_count, streak, best_streak from user_stats where user_id = '00000000-0000-4000-8000-0000000000a1' $$,
  $$ values (7, 5, 0, 3) $$,
  'a wrong answer resets the streak and keeps the best streak');

select is(
  (select accuracy from user_stats where user_id = '00000000-0000-4000-8000-0000000000a1'),
  71, 'accuracy is floor(x + 0.5) of 5/7 = 71, as the old functions computed it');

update user_stats set total_answered = 99, correct_count = 1, streak = 0, best_streak = 0
 where user_id = '00000000-0000-4000-8000-0000000000a1';
select is(rebuild_user_stats('00000000-0000-4000-8000-0000000000a1'), 1, 'rebuild upserts the one account');
select results_eq(
  $$ select total_answered, correct_count, streak, best_streak from user_stats where user_id = '00000000-0000-4000-8000-0000000000a1' $$,
  $$ values (7, 5, 0, 3) $$,
  'rebuild recomputes the same numbers the trigger produced');

delete from quiz_results where user_id = '00000000-0000-4000-8000-0000000000a1';
select is(rebuild_user_stats('00000000-0000-4000-8000-0000000000a1'), 0, 'rebuild with no results upserts nothing');
select is_empty(
  $$ select 1 from user_stats where user_id = '00000000-0000-4000-8000-0000000000a1' $$,
  'rebuild removes the stats row of an account with no results');

select is(has_table_privilege('anon', 'public.user_stats', 'select'), false, 'anon cannot read user_stats');

select * from finish();
rollback;
