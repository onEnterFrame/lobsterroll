-- Add 'failed' to mention_status enum and add failed_at / failure_reason columns

ALTER TYPE mention_status ADD VALUE IF NOT EXISTS 'failed';

ALTER TABLE mention_events
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason text;
