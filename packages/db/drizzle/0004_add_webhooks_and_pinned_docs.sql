-- Add inbound webhooks + pinned docs flag

-- 1. Channel webhooks table
CREATE TABLE IF NOT EXISTS channel_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  name text NOT NULL,
  token text NOT NULL,
  created_by uuid NOT NULL REFERENCES accounts(id),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS channel_webhooks_token_idx
  ON channel_webhooks (token);

CREATE INDEX IF NOT EXISTS channel_webhooks_channel_id_idx
  ON channel_webhooks (channel_id);

-- 2. Add pinned flag to channel_docs
ALTER TABLE channel_docs
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
