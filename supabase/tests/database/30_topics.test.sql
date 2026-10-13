begin;
select plan(13);

select is(slugify_topic('  DeFi & NFTs '), 'defi-nfts', 'slug lowercases and collapses punctuation');
select is(slugify_topic('Lịch sử'), 'lich-su', 'slug strips accents so different names stay different');
select is(slugify_topic('歴史'), 'topic-' || substr(md5('歴史'), 1, 8), 'a name with no latin letters gets a stable hash slug');

-- A question inserted with only a category (what old code does) gets its topic from the trigger.
insert into questions (id, prompt, options, correct_index, category) values
  ('00000000-0000-4000-8000-0000000000d1', 'first topic question', '["a","b"]', 0, 'DeFi'),
  ('00000000-0000-4000-8000-0000000000d2', 'second topic question', '["a","b"]', 0, ' defi ');
select isnt((select topic_id from questions where id = '00000000-0000-4000-8000-0000000000d1'), null, 'the trigger sets topic_id');
select is(
  (select topic_id from questions where id = '00000000-0000-4000-8000-0000000000d1'),
  (select topic_id from questions where id = '00000000-0000-4000-8000-0000000000d2'),
  'two spellings of one name share a topic');
select is((select count(*)::int from topics where slug = 'defi'), 1, 'one topic row for the slug');
select is((select name from topic_translations where topic_id = (select id from topics where slug = 'defi') and locale = 'en'), 'DeFi', 'the first spelling becomes the en name');

select results_eq(
  $$ select slug, name, question_count from get_topics() $$,
  $$ values ('defi'::text, 'DeFi'::text, 2) $$,
  'get_topics groups by topic and falls back to en');
select results_eq(
  $$ select slug, name from get_topics('fr') $$,
  $$ values ('defi'::text, 'DeFi'::text) $$,
  'a locale with no translation falls back to en');

select is(resolve_topic('DEFI'), (select id from topics where slug = 'defi'), 'resolve_topic matches case-insensitively');
select is(resolve_topic('nothing like it'), null, 'resolve_topic returns null for an unknown name');

select is((select count(*)::int from search_questions('defi', 10, 0)), 2, 'search still finds the questions, now through the topic name');
select is(has_function_privilege('anon', 'get_or_create_topic(text)', 'execute'), false, 'only the server may create topics');

select * from finish();
rollback;
