-- Phase 2b. questions.dispute_count becomes derived: the number of unresolved disputes.
-- The app used to count and then write, so two concurrent reports could write a stale count.
-- The trigger locks the question row in its own statement before counting, so the count
-- statement's snapshot is taken after any concurrent dispute transaction has committed:
-- dispute_count equals the unresolved count even under concurrent reports.
-- The lock mode is NO KEY UPDATE, not UPDATE: the foreign-key check of a dispute insert
-- already holds KEY SHARE on the parent question, and two inserts that each hold KEY SHARE
-- and then ask for FOR UPDATE deadlock (FOR UPDATE conflicts with KEY SHARE; NO KEY UPDATE
-- does not, yet NO KEY UPDATE locks still conflict with each other, so recounts serialise).
-- The quarantine decision itself stays in the app (QUARANTINE_AT = 3) and still uses the
-- app's own countDisputes read, which is not serialised with this trigger.
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
  -- Own statement: the UPDATE below then takes its snapshot after the lock wait.
  PERFORM 1 FROM questions WHERE id = qid FOR NO KEY UPDATE;
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
