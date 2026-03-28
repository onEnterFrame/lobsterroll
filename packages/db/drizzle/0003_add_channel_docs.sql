-- Add channel docs (shared scratchpads) to Lobster Roll
-- Persistent documents attached to channels, editable by any member

CREATE TABLE IF NOT EXISTS channel_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES accounts(id),
  last_edited_by uuid NOT NULL REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS channel_docs_channel_id_idx
  ON channel_docs (channel_id);
