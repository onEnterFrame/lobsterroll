import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  pgEnum,
  uniqueIndex,
  index,
  boolean,
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
  'failed',
]);

export const callbackMethodEnum = pgEnum('callback_method', ['webhook', 'websocket', 'poll', 'openclaw']);

export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'denied']);

export const presenceStatusEnum = pgEnum('presence_status', ['online', 'idle', 'offline', 'dnd']);

export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'expired',
  'revoked',
]);

// ── Tables ─────────────────────────────────────────────────────────────

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    ownerId: text('owner_id').notNull(),
    provisioningMode: provisioningModeEnum('provisioning_mode').notNull().default('open'),
    agentProvisionToken: text('agent_provision_token').notNull(),
    settings: jsonb('settings').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('workspaces_slug_idx').on(table.slug),
    uniqueIndex('workspaces_agent_provision_token_idx').on(table.agentProvisionToken),
  ],
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
    avatarUrl: text('avatar_url'),
    presenceStatus: presenceStatusEnum('presence_status').notNull().default('offline'),
    statusMessage: text('status_message'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
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
    editedAt: timestamp('edited_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
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
    failedAt: timestamp('failed_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
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

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: subscriptionRoleEnum('role').notNull().default('member'),
    invitedBy: uuid('invited_by').references(() => accounts.id),
    token: text('token').notNull(),
    status: invitationStatusEnum('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('invitations_token_idx').on(table.token),
    index('invitations_email_idx').on(table.email),
    index('invitations_workspace_id_idx').on(table.workspaceId),
  ],
);

export const taskStatusEnum = pgEnum('task_status', ['pending', 'accepted', 'completed', 'rejected']);

export const messageTasks = pgTable(
  'message_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    assignerId: uuid('assigner_id')
      .notNull()
      .references(() => accounts.id),
    assigneeId: uuid('assignee_id')
      .notNull()
      .references(() => accounts.id),
    title: text('title').notNull(),
    status: taskStatusEnum('status').notNull().default('pending'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  },
  (table) => [
    index('message_tasks_assignee_id_status_idx').on(table.assigneeId, table.status),
    index('message_tasks_channel_id_idx').on(table.channelId),
    index('message_tasks_message_id_idx').on(table.messageId),
  ],
);

export const channelDocs = pgTable(
  'channel_docs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content').notNull().default(''),
    pinned: boolean('pinned').notNull().default(false),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => accounts.id),
    lastEditedBy: uuid('last_edited_by')
      .notNull()
      .references(() => accounts.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('channel_docs_channel_id_idx').on(table.channelId),
  ],
);

export const reactions = pgTable(
  'reactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
    semanticMeaning: text('semantic_meaning'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('reactions_message_account_emoji_idx').on(table.messageId, table.accountId, table.emoji),
    index('reactions_message_id_idx').on(table.messageId),
  ],
);

export const scheduledMessages = pgTable(
  'scheduled_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => accounts.id),
    content: text('content').notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    cronExpr: text('cron_expr'),
    timezone: text('timezone').notNull().default('UTC'),
    enabled: boolean('enabled').notNull().default(true),
    lastSentAt: timestamp('last_sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('scheduled_messages_enabled_scheduled_at_idx').on(table.enabled, table.scheduledAt),
  ],
);

export const readReceipts = pgTable(
  'read_receipts',
  {
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    lastReadMessageId: uuid('last_read_message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('read_receipts_channel_account_idx').on(table.channelId, table.accountId),
    index('read_receipts_channel_id_idx').on(table.channelId),
  ],
);

export const savedMessages = pgTable(
  'saved_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('saved_messages_account_message_idx').on(table.accountId, table.messageId),
    index('saved_messages_account_id_idx').on(table.accountId),
  ],
);

export const agentMetrics = pgTable(
  'agent_metrics',
  {
    accountId: uuid('account_id')
      .primaryKey()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    messageCount: integer('message_count').notNull().default(0),
    mentionResponseAvgMs: jsonb('mention_response_avg_ms'),
    lastActiveChannelId: uuid('last_active_channel_id'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    tasksCompleted: integer('tasks_completed').notNull().default(0),
    tasksAssigned: integer('tasks_assigned').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

export const agentCapabilities = pgTable(
  'agent_capabilities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    tags: jsonb('tags').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('agent_capabilities_account_id_idx').on(table.accountId),
  ],
);

export const channelWebhooks = pgTable(
  'channel_webhooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    token: text('token').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => accounts.id),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('channel_webhooks_token_idx').on(table.token),
    index('channel_webhooks_channel_id_idx').on(table.channelId),
  ],
);

export const presenceLog = pgTable(
  'presence_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    status: presenceStatusEnum('status').notNull(),
    statusMessage: text('status_message'),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('presence_log_account_id_changed_at_idx').on(table.accountId, table.changedAt),
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
