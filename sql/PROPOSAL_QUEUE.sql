-- ============================================
-- Proposal Queue (extension of Tax Vote System)
-- Logan can schedule up to 3 proposals at once. The first becomes 'active'
-- (timer running, banner visible). The next ones go into a 'queued' state
-- with their durations stored. When the active one completes, a trigger
-- auto-promotes the oldest queued proposal to 'active' and converts its
-- stored duration into real timer_start / timer_end timestamps.
--
-- This is a backend-only change. No UI surfaces the queue today; clients
-- just see the next active banner appear after the current one ends.
-- ============================================

-- =====================
-- 1. Allow status='queued'
-- =====================
DO $constraint$
BEGIN
  ALTER TABLE change_proposals DROP CONSTRAINT IF EXISTS change_proposals_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END
$constraint$;

ALTER TABLE change_proposals
  ADD CONSTRAINT change_proposals_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'completed', 'queued'));

-- =====================
-- 2. Queue metadata columns
-- =====================
ALTER TABLE change_proposals
  ADD COLUMN IF NOT EXISTS queued_duration_ms BIGINT;

ALTER TABLE change_proposals
  ADD COLUMN IF NOT EXISTS queued_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_change_proposals_queued_at
  ON change_proposals(queued_at ASC NULLS LAST)
  WHERE status = 'queued';

-- =====================
-- 3. Auto-promote trigger
-- When an 'active' proposal flips to 'completed', the oldest 'queued'
-- proposal is promoted to 'active' with its stored duration.
-- =====================
CREATE OR REPLACE FUNCTION promote_queued_proposal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_next_id        UUID;
  v_duration_ms    BIGINT;
BEGIN
  -- Only fire on the active -> completed transition.
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    -- Defensive: bail if some other row already became active in the meantime.
    IF EXISTS (SELECT 1 FROM change_proposals WHERE status = 'active') THEN
      RETURN NEW;
    END IF;

    SELECT id, queued_duration_ms
      INTO v_next_id, v_duration_ms
      FROM change_proposals
     WHERE status = 'queued'
       AND queued_duration_ms IS NOT NULL
     ORDER BY queued_at ASC NULLS LAST, created_at ASC
     LIMIT 1;

    IF v_next_id IS NOT NULL AND v_duration_ms IS NOT NULL AND v_duration_ms > 0 THEN
      UPDATE change_proposals
         SET status             = 'active',
             timer_start        = NOW(),
             timer_end          = NOW() + make_interval(secs => v_duration_ms::DOUBLE PRECISION / 1000),
             queued_duration_ms = NULL,
             queued_at          = NULL,
             updated_at         = NOW()
       WHERE id = v_next_id
         AND status = 'queued';
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_promote_queued_proposal ON change_proposals;
CREATE TRIGGER trg_promote_queued_proposal
  AFTER UPDATE ON change_proposals
  FOR EACH ROW
  EXECUTE FUNCTION promote_queued_proposal();
