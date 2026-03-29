-- Fix agent_metrics integer columns: convert from jsonb to integer
-- The jsonb cast (::int) was broken; these should be plain integer columns.
-- Note: defaults must be dropped before type change, then restored.

ALTER TABLE agent_metrics
  ALTER COLUMN message_count DROP DEFAULT,
  ALTER COLUMN tasks_completed DROP DEFAULT,
  ALTER COLUMN tasks_assigned DROP DEFAULT;

ALTER TABLE agent_metrics
  ALTER COLUMN message_count TYPE integer USING (message_count::text::integer),
  ALTER COLUMN tasks_completed TYPE integer USING (tasks_completed::text::integer),
  ALTER COLUMN tasks_assigned TYPE integer USING (tasks_assigned::text::integer);

ALTER TABLE agent_metrics
  ALTER COLUMN message_count SET DEFAULT 0,
  ALTER COLUMN tasks_completed SET DEFAULT 0,
  ALTER COLUMN tasks_assigned SET DEFAULT 0;
