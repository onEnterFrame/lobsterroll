-- Read receipts
CREATE TABLE IF NOT EXISTS read_receipts (
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  last_read_message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS read_receipts_channel_account_idx
  ON read_receipts (channel_id, account_id);

CREATE INDEX IF NOT EXISTS read_receipts_channel_id_idx
  ON read_receipts (channel_id);

-- Saved messages (bookmarks)
CREATE TABLE IF NOT EXISTS saved_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS saved_messages_account_message_idx
  ON saved_messages (account_id, message_id);

CREATE INDEX IF NOT EXISTS saved_messages_account_id_idx
  ON saved_messages (account_id);

-- Message editing + soft delete
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Full-text search index for messages
CREATE INDEX IF NOT EXISTS messages_content_trgm_idx
  ON messages USING gin (content gin_trgm_ops);

-- Enable trigram extension (needed for ILIKE performance)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
