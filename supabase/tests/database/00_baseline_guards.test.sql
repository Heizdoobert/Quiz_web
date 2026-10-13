begin;
select plan(8);

select is(
  (select count(*)::int
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0, 'every public table has row level security on');

select is(has_column_privilege('anon', 'public.questions', 'correct_index', 'select'), false,
  'anon cannot read questions.correct_index');
select is(has_column_privilege('authenticated', 'public.questions', 'correct_index', 'select'), false,
  'authenticated cannot read questions.correct_index');
select is(has_column_privilege('anon', 'public.questions', 'explanation', 'select'), false,
  'anon cannot read questions.explanation');
select is(has_column_privilege('anon', 'public.users', 'role', 'select'), false,
  'anon cannot read users.role');
select is(has_column_privilege('authenticated', 'public.users', 'role', 'select'), false,
  'authenticated cannot read users.role');
select is(has_column_privilege('anon', 'public.questions', 'prompt', 'select'), true,
  'anon can still read questions.prompt');

select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
  0, 'every SECURITY DEFINER function pins its search_path');

select * from finish();
rollback;
