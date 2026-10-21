# supabase/tests/database/11_drop_contest_schema.test.sql
lines:20 exports:
---
begin;
select plan(7);

insert into topics (slug) values ('general') on conflict (slug) do nothing;

select hasnt_table('question_lists', 'question_lists is gone');
select hasnt_table('list_entries', 'list_entries is gone');
select hasnt_table('question_list_confirmations', 'question_list_confirmations is gone');
select hasnt_column('questions', 'list_id', 'questions.list_id is gone');
select hasnt_function('get_contest_analytics', 'get_contest_analytics is gone');
select hasnt_view('client_questions', 'client_questions is gone');

-- Only verified questions appear in topics and search.
insert into questions (id, prompt, options, correct_index, status, topic_id) values
  ('00000000-0000-4000-8000-0000000000e1', 'a verified question prompt', '["a","b"]', 0, 'verified', (select id from topics where slug = 'general')),
  ('00000000-0000-4000-8000-0000000000e2', 'a rejected question prompt', '["a","b"]', 0, 'rejected', (select id from topics where slug = 'general'));
select is((select sum(question_count)::int from get_topics()), 1, 'topics count only verified questions');

select * from finish();
rollback;
