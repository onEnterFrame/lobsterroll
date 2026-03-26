import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ── Enums ──────────────────────────────────────────────────────────────

export const provisioningModeEnum = pgEnum('provisioning_mode', [
  'open',
  'supervised',
  'locked',
]);

export const accountTypeEnum = pgEnum('account_type', ['human', 'agent', 'sub_agent']);

export const authMethodEnum = pgEnum('auth_method', ['supabase', 'api_key']);

export const accountStatusEnum = pgEnum('account_status', ['active', 'frozen', 'deactivated']);

export const channelTypeEnum = pgEnum('channel_type', ['text', 'file_drop', 'voice', 'broadcast']);

export const channelVisibilityEnum = pgEnum('channel_visibility', ['public', 'private']);

export const subscriptionRoleEnum = pgEnum('subscription_role', ['member', 'admin']);

export const mentionStatusEnum = pgEnum('mention_status', [
  'delivered',
  'acknowledged',
  'responded',
  'timed_out',
]);

export const callbackMethodEnum = pgEnum('callback_method', ['webhook', 'websocket', 'poll']);

export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'denied']);

// ── Tables ─────────────────────────────────────────────────────────────

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    ownerId: text('owner_id').notNull(),
    provisioningMode: provisioningModeEnum('provisioning_mode').notNull().default('open'),
    settings: jsonb('settings').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('workspaces_slug_idx').on(table.slug)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    accountType: accountTypeEnum('account_type').notNull(),
    parentId: uuid('parent_id'),
    ownerId: text('owner_id'),
    authMethod: authMethodEnum('auth_method').notNull().default('api_key'),
    apiKeyHash: text('api_key_hash'),
    status: accountStatusEnum('status').notNull().default('active'),
    permissions: jsonb('permissions').notNull().default([]),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
  },
  (table) => [
    uniqueIndex('accounts_api_key_hash_idx').on(table.apiKeyHash),
    index('accounts_workspace_id_idx').on(table.workspaceId),
    index('accounts_parent_id_idx').on(table.parentId),
  ],
);

export const channels = pgTable(
  'channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    channelType: channelTypeEnum('channel_type').notNull().default('text'),
    visibility: channelVisibilityEnum('visibility').notNull().default('public'),
    topic: text('topic'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('channels_workspace_id_idx').on(table.workspaceId)],
);

export const channelSubscriptions = pgTable(
  'channel_subscriptions',
  {
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    role: subscriptionRoleEnum('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('channel_subscriptions_pkey').on(table.channelId, table.accountId),
    index('channel_subscriptions_account_id_idx').on(table.accountId),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => accounts.id),
    content: text('content').notNull(),
    mentions: jsonb('mentions').notNull().default([]),
    payload: jsonb('payload'),
    threadId: uuid('thread_id'),
    attachments: jsonb('attachments').notNull().default([]),
    replyTo: uuid('reply_to'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('messages_channel_id_created_at_idx').on(table.channelId, table.createdAt),
    index('messages_thread_id_idx').on(table.threadId),
  ],
);

export const mentionEvents = pgTable(
  'mention_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    targetId: uuid('target_id')
      .notNull()
      .references(() => accounts.id),
    status: mentionStatusEnum('status').notNull().default('delivered'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    ackedAt: timestamp('acked_at', { withTimezone: true }),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    timedOutAt: timestamp('timed_out_at', { withTimezone: true }),
  },
  (table) => [
    index('mention_events_target_id_status_idx').on(table.targetId, table.status),
    index('mention_events_message_id_idx').on(table.messageId),
  ],
);

export const agentCallbacks = pgTable('agent_callbacks', {
  accountId: uuid('account_id')
    .primaryKey()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  method: callbackMethodEnum('method').notNull(),
  config: jsonb('config').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const approvals = pgTable(
  'approvals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => accounts.id),
    actionType: text('action_type').notNull(),
    actionData: jsonb('action_data').notNull().default({}),
    status: approvalStatusEnum('status').notNull().default('pending'),
    decidedBy: uuid('decided_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('approvals_workspace_id_status_idx').on(table.workspaceId, table.status),
  ],
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id'),
    action: text('action').notNull(),
    targetId: text('target_id'),
    metadata: jsonb('metadata').notNull().default({}),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_log_workspace_id_timestamp_idx').on(table.workspaceId, table.timestamp),
  ],
);
