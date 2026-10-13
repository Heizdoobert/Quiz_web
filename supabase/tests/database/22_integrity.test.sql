begin;
select plan(12);

insert into topics (slug) values ('general') on conflict (slug) do nothing;

insert into users (id, display_name) values ('00000000-0000-4000-8000-0000000000a1', 'integrity');
insert into questions (id, prompt, options, correct_index, topic_id) values
  ('00000000-0000-4000-8000-0000000000d1', 'integrity question prompt', '["a","b"]', 0, (select id from topics where slug = 'general'));

select throws_ok($$ insert into questions (prompt, options, correct_index, topic_id) values ('p', '["a"]', 0, (select id from topics where slug = 'general')) $$,
  '23514', null, 'a question needs at least 2 options');
select throws_ok($$ insert into questions (prompt, options, correct_index, topic_id) values ('p', '["a","b","c","d","e"]', 0, (select id from topics where slug = 'general')) $$,
  '23514', null, 'a question has at most 4 options');
select throws_ok($$ insert into questions (prompt, options, correct_index, topic_id) values ('p', '{"a":1}', 0, (select id from topics where slug = 'general')) $$,
  '23514', null, 'options must be a JSON array');
select throws_ok($$ insert into questions (prompt, options, correct_index, topic_id) values ('p', '["a","b"]', 3, (select id from topics where slug = 'general')) $$,
  '23514', null, 'correct_index must point at an option');
select throws_ok($$ insert into questions (prompt, options, correct_index, topic_id) values (repeat('x', 301), '["a","b"]', 0, (select id from topics where slug = 'general')) $$,
  '23514', null, 'a prompt is at most 300 characters');
select throws_ok($$ insert into quiz_results (user_id, question_id, answer_index, is_correct) values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000d1', 4, false) $$,
  '23514', null, 'answer_index is -1 to 3');
select lives_ok($$ insert into quiz_results (user_id, question_id, answer_index, is_correct) values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000d1', -1, false) $$,
  'answer_index -1 (timeout sentinel) is allowed');
select throws_ok($$ insert into question_disputes (question_id, reporter_user, reason) values ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000a1', repeat('x', 501)) $$,
  '23514', null, 'a dispute reason is at most 500 characters');
select throws_ok($$ insert into groups (name, owner_user) values (repeat('x', 51), '00000000-0000-4000-8000-0000000000a1') $$,
  '23514', null, 'a group name is at most 50 characters');

select has_index('quiz_results', 'quiz_results_user_answered', 'history index exists');
select has_index('questions', 'questions_status_created', 'status index exists');
select has_index('groups', 'groups_owner_user', 'owner index exists');

select * from finish();
rollback;
