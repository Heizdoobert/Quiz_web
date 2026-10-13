begin;
select plan(5);

-- Fixture: a contest list with one live-looking question, and one ordinary question.
insert into users (id, display_name) values ('00000000-0000-4000-8000-0000000000b1', 'p1');
insert into question_lists (id, owner_user, title) values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'contest');
insert into questions (id, prompt, options, correct_index, status, list_id) values
  ('00000000-0000-4000-8000-0000000000d1', 'contest question prompt', '["a","b"]', 0, 'verified', '00000000-0000-4000-8000-0000000000c1'),
  ('00000000-0000-4000-8000-0000000000d2', 'ordinary question prompt', '["a","b"]', 0, 'verified', null);

select unalike(pg_get_functiondef('get_topics()'::regprocedure), '%list_id%', 'get_topics no longer filters on list_id');
select unalike(pg_get_functiondef('search_questions(text,integer,integer)'::regprocedure), '%list_id%', 'search_questions no longer filters on list_id');

-- The migration's retire statement, run again on the fixture: it must touch only contest rows.
update questions set status = 'rejected' where list_id is not null and status <> 'rejected';
select is((select status from questions where id = '00000000-0000-4000-8000-0000000000d1'), 'rejected', 'the contest question is retired');
select is((select status from questions where id = '00000000-0000-4000-8000-0000000000d2'), 'verified', 'the ordinary question is untouched');
select is((select question_count from get_topics() limit 1), 1, 'only the ordinary question is counted in topics');

select * from finish();
rollback;
