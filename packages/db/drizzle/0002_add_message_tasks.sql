-- Add inline task system to Lobster Roll
-- Tasks are tied to messages — any message can become a task by assigning it

-- 1. Create the task_status enum
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'accepted', 'completed', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create message_tasks table
CREATE TABLE IF NOT EXISTS message_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  assigner_id uuid NOT NULL REFERENCES accounts(id),
  assignee_id uuid NOT NULL REFERENCES accounts(id),
  title text NOT NULL,
  status task_status NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  rejected_at timestamptz
);

CREATE INDEX IF NOT EXISTS message_tasks_assignee_id_status_idx
  ON message_tasks (assignee_id, status);

CREATE INDEX IF NOT EXISTS message_tasks_channel_id_idx
  ON message_tasks (channel_id);

CREATE INDEX IF NOT EXISTS message_tasks_message_id_idx
  ON message_tasks (message_id);
