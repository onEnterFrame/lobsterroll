-- Threads: already supported via messages.thread_id — no DDL needed

-- Avatars: add avatar_url to accounts
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Agent activity metrics
CREATE TABLE IF NOT EXISTS agent_metrics (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  message_count jsonb NOT NULL DEFAULT '0',
  mention_response_avg_ms jsonb,
  last_active_channel_id uuid,
  last_message_at timestamptz,
  tasks_completed jsonb NOT NULL DEFAULT '0',
  tasks_assigned jsonb NOT NULL DEFAULT '0',
  updated_at timestamptz NOT NULL DEFAULT now()
);
