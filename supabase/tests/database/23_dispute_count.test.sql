begin;
select plan(5);

insert into users (id, display_name) values
  ('00000000-0000-4000-8000-0000000000a1', 'rep1'),
  ('00000000-0000-4000-8000-0000000000a2', 'rep2'),
  ('00000000-0000-4000-8000-0000000000a3', 'mod1');
insert into questions (id, prompt, options, correct_index) values
  ('00000000-0000-4000-8000-0000000000d1', 'dispute question prompt', '["a","b"]', 0);

insert into question_disputes (id, question_id, reporter_user, reason) values
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000a1', 'wrong'),
  ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000a2', 'wrong');
select is((select dispute_count from questions where id = '00000000-0000-4000-8000-0000000000d1'), 2, 'two open disputes count as 2');

update question_disputes set resolved_at = now(), resolution = 'restored' where id = '00000000-0000-4000-8000-0000000000e1';
select is((select dispute_count from questions where id = '00000000-0000-4000-8000-0000000000d1'), 1, 'a resolved dispute no longer counts');

delete from question_disputes where id = '00000000-0000-4000-8000-0000000000e2';
select is((select dispute_count from questions where id = '00000000-0000-4000-8000-0000000000d1'), 0, 'a deleted dispute no longer counts');

insert into question_disputes (question_id, reporter_user, reason)
values ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000a2', 'again');
update questions set status = 'quarantined' where id = '00000000-0000-4000-8000-0000000000d1';
select is(resolve_quarantined_question('00000000-0000-4000-8000-0000000000d1', 'restored', '00000000-0000-4000-8000-0000000000a3', 'ok'), true, 'moderator restores');
select is((select dispute_count from questions where id = '00000000-0000-4000-8000-0000000000d1'), 0, 'a restored question starts again from zero');

select * from finish();
rollback;
