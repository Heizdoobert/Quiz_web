-- Read-only. Run in the Supabase SQL editor on PRODUCTION; save each result next to this file.

-- 1. Server version (sets supabase/config.toml [db] major_version).
select version();

-- 2. Tables without row level security (expect zero rows).
select c.relname
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- 3. Function ACLs. proacl NULL means the default: EXECUTE for PUBLIC.
select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef as security_definer,
       p.proconfig, p.proacl
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
 order by p.proname;

-- 4. Can the public key execute the SECURITY DEFINER functions? (settles spec finding F7)
select p.proname,
       has_function_privilege('anon', p.oid, 'execute')          as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosecdef
 order by p.proname;

-- 5. Column privileges that hide answers and roles (expect all false).
select has_column_privilege('anon', 'public.questions', 'correct_index', 'select')          as anon_correct_index,
       has_column_privilege('authenticated', 'public.questions', 'correct_index', 'select') as auth_correct_index,
       has_column_privilege('anon', 'public.questions', 'explanation', 'select')            as anon_explanation,
       has_column_privilege('anon', 'public.users', 'role', 'select')                       as anon_role,
       has_column_privilege('authenticated', 'public.users', 'role', 'select')              as auth_role;

-- 6. Row counts (used again by Phase 1).
select 'users' as t, count(*) from users
union all select 'questions', count(*) from questions
union all select 'questions with list_id', count(*) from questions where list_id is not null
union all select 'questions with list_id not rejected', count(*) from questions where list_id is not null and status <> 'rejected'
union all select 'quiz_results', count(*) from quiz_results
union all select 'groups', count(*) from groups
union all select 'question_disputes', count(*) from question_disputes
union all select 'question_lists', count(*) from question_lists
union all select 'list_entries', count(*) from list_entries
union all select 'question_list_confirmations', count(*) from question_list_confirmations
union all select 'sponsors', count(*) from sponsors
union all select 'distinct categories', count(distinct lower(trim(category))) from questions;
