\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
SELECT 'count ' || t || ' ' || n FROM (
  SELECT 'questions' AS t, count(*) AS n FROM questions
  UNION ALL SELECT 'quiz_results', count(*) FROM quiz_results
  UNION ALL SELECT 'groups', count(*) FROM groups
  UNION ALL SELECT 'group_members', count(*) FROM group_members
  UNION ALL SELECT 'question_lists', count(*) FROM question_lists
  UNION ALL SELECT 'question_list_confirmations', count(*) FROM question_list_confirmations
  UNION ALL SELECT 'list_entries', count(*) FROM list_entries
  UNION ALL SELECT 'reward_claims', count(*) FROM reward_claims
  UNION ALL SELECT 'question_disputes', count(*) FROM question_disputes
) c ORDER BY t;
SELECT 'stats ' || left(w, 4) || ' ' || row_to_json(s)::text
FROM unnest(ARRAY['0x' || repeat('a', 40), '0x' || repeat('b', 40), '0x' || repeat('c', 40)]) w,
     LATERAL get_user_stats(w) s ORDER BY w;
SELECT 'global ' || row_to_json(l)::text FROM get_global_leaderboard(50) l;
SELECT 'group ' || row_to_json(l)::text FROM groups g, LATERAL get_group_leaderboard(g.id, 50) l;
