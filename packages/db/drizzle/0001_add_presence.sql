-- Add presence system to Lobster Roll
-- Adds presence status tracking to accounts + presence_log for history

-- 1. Create the presence_status enum
DO $$ BEGIN
  CREATE TYPE presence_status AS ENUM ('online', 'idle', 'offline', 'dnd');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add presence columns to accounts
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS presence_status presence_status NOT NULL DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS status_message text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- 3. Create presence_log table
CREATE TABLE IF NOT EXISTS presence_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status presence_status NOT NULL,
  status_message text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS presence_log_account_id_changed_at_idx
  ON presence_log (account_id, changed_at);
