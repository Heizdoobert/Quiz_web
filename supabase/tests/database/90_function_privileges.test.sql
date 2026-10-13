begin;
select plan(3);

select set_eq(
  $$ select p.proname::text
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute') $$,
  array['get_user_stats', 'get_global_leaderboard', 'get_group_leaderboard', 'get_topics', 'search_questions', 'get_rating_summary', 'resolve_topic'],
  'only the public read functions are callable with the public key');

select is(has_function_privilege('authenticated', 'increment_ai_generation(uuid)', 'execute'), false,
  'authenticated cannot burn another account''s AI quota');
select is(has_function_privilege('service_role', 'get_question_analytics(uuid)', 'execute'), true,
  'the server can still read question analytics');

select * from finish();
rollback;
