begin;
select plan(4);

select hasnt_column('questions', 'category', 'questions.category is gone');
select col_not_null('questions', 'topic_id', 'topic_id is required');
select hasnt_trigger('questions', 'questions_set_topic', 'the bridge trigger is gone');
select throws_ok(
  $$ insert into questions (prompt, options, correct_index) values ('no topic given', '["a","b"]', 0) $$,
  '23502', null, 'a question without a topic is refused');

select * from finish();
rollback;
