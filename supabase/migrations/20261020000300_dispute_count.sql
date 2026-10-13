-- Phase 2b. questions.dispute_count becomes derived: the number of unresolved disputes.
-- The app used to count and then write, so two concurrent reports could miss the quarantine
-- threshold. The quarantine decision itself stays in the app (QUARANTINE_AT = 3).
-- One visible change: a retired question now shows 0 open disputes (they are all resolved).
BEGIN;

CREATE OR REPLACE FUNCTION sync_dispute_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qid UUID := COALESCE(NEW.question_id, OLD.question_id);
BEGIN
  UPDATE questions
     SET dispute_count = (SELECT count(*) FROM question_disputes WHERE question_id = qid AND resolved_at IS NULL)
   WHERE id = qid;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION sync_dispute_count() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS question_disputes_sync_count ON question_disputes;
CREATE TRIGGER question_disputes_sync_count
  AFTER INSERT OR DELETE OR UPDATE OF resolved_at ON question_disputes
  FOR EACH ROW EXECUTE FUNCTION sync_dispute_count();

-- Backfill to the derived value.
UPDATE questions q
   SET dispute_count = d.n
  FROM (SELECT question_id, count(*)::int AS n FROM question_disputes WHERE resolved_at IS NULL GROUP BY question_id) d
 WHERE q.id = d.question_id AND q.dispute_count <> d.n;
UPDATE questions q
   SET dispute_count = 0
 WHERE q.dispute_count <> 0
   AND NOT EXISTS (SELECT 1 FROM question_disputes d WHERE d.question_id = q.id AND d.resolved_at IS NULL);

COMMIT;
