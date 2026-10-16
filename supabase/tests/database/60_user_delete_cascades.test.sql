begin;
select plan(9);

insert into topics (slug) values ('general') on conflict (slug) do nothing;

insert into users (id, display_name) values
  ('00000000-0000-4000-8000-0000000000a1', 'leaver'),
  ('00000000-0000-4000-8000-0000000000a2', 'stayer');
insert into questions (id, prompt, options, correct_index, topic_id, created_by_user) values
  ('00000000-0000-4000-8000-0000000000d1', 'written by the leaver', '["a","b"]', 0, (select id from topics where slug = 'general'), '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000d2', 'written by the stayer', '["a","b"]', 0, (select id from topics where slug = 'general'), '00000000-0000-4000-8000-0000000000a2');

-- the stayer interacts with the leaver's question
insert into question_ratings (question_id, user_id, rating) values ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000a2', 5);
insert into question_comments (question_id, user_id, kind, body) values ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000a2', 'comment', 'nice');
insert into question_disputes (question_id, reporter_user, reason) values ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000a2', 'wrong');
insert into quiz_results (user_id, question_id, answer_index, is_correct) values ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000d1', 0, true);
insert into quiz_results (user_id, question_id, answer_index, is_correct) values ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000d2', 0, true);
insert into user_stats (user_id, total_answered, correct_count) values ('00000000-0000-4000-8000-0000000000a2', 2, 2)
  on conflict (user_id) do update set total_answered = 2, correct_count = 2;

select lives_ok($$ delete from users where id = '00000000-0000-4000-8000-0000000000a1' $$,
  'deleting a user who wrote questions succeeds');

select is((select count(*)::int from questions where id = '00000000-0000-4000-8000-0000000000d1'), 0, 'the leaver''s question is deleted');
select is((select count(*)::int from question_ratings where question_id = '00000000-0000-4000-8000-0000000000d1'), 0, 'ratings on it are deleted');
select is((select count(*)::int from question_comments where question_id = '00000000-0000-4000-8000-0000000000d1'), 0, 'comments on it are deleted');
select is((select count(*)::int from question_disputes where question_id = '00000000-0000-4000-8000-0000000000d1'), 0, 'disputes on it are deleted');
select is((select count(*)::int from quiz_results where question_id = '00000000-0000-4000-8000-0000000000d1'), 0, 'results on it are deleted');

select is((select count(*)::int from questions where id = '00000000-0000-4000-8000-0000000000d2'), 1, 'another user''s question stays');
select is((select count(*)::int from quiz_results where question_id = '00000000-0000-4000-8000-0000000000d2'), 1, 'another user''s answer to their own question stays');
select is((select total_answered from user_stats where user_id = '00000000-0000-4000-8000-0000000000a2'), 2, 'another user''s stats counters stay');

select * from finish();
rollback;
