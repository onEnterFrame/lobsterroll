import { relations } from 'drizzle-orm';
import {
  workspaces,
  accounts,
  channels,
  channelSubscriptions,
  messages,
  mentionEvents,
  agentCallbacks,
  approvals,
  auditLog,
} from './schema.js';

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  accounts: many(accounts),
  channels: many(channels),
  approvals: many(approvals),
  auditLog: many(auditLog),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [accounts.workspaceId],
    references: [workspaces.id],
  }),
  parent: one(accounts, {
    fields: [accounts.parentId],
    references: [accounts.id],
    relationName: 'parentChild',
  }),
  children: many(accounts, { relationName: 'parentChild' }),
  subscriptions: many(channelSubscriptions),
  sentMessages: many(messages),
  mentionEvents: many(mentionEvents),
  callback: one(agentCallbacks, {
    fields: [accounts.id],
    references: [agentCallbacks.accountId],
  }),
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [channels.workspaceId],
    references: [workspaces.id],
  }),
  subscriptions: many(channelSubscriptions),
  messages: many(messages),
}));

export const channelSubscriptionsRelations = relations(channelSubscriptions, ({ one }) => ({
  channel: one(channels, {
    fields: [channelSubscriptions.channelId],
    references: [channels.id],
  }),
  account: one(accounts, {
    fields: [channelSubscriptions.accountId],
    references: [accounts.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  channel: one(channels, {
    fields: [messages.channelId],
    references: [channels.id],
  }),
  sender: one(accounts, {
    fields: [messages.senderId],
    references: [accounts.id],
  }),
  mentionEvents: many(mentionEvents),
}));

export const mentionEventsRelations = relations(mentionEvents, ({ one }) => ({
  message: one(messages, {
    fields: [mentionEvents.messageId],
    references: [messages.id],
  }),
  target: one(accounts, {
    fields: [mentionEvents.targetId],
    references: [accounts.id],
  }),
}));

export const agentCallbacksRelations = relations(agentCallbacks, ({ one }) => ({
  account: one(accounts, {
    fields: [agentCallbacks.accountId],
    references: [accounts.id],
  }),
}));

export const approvalsRelations = relations(approvals, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [approvals.workspaceId],
    references: [workspaces.id],
  }),
  requester: one(accounts, {
    fields: [approvals.requesterId],
    references: [accounts.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [auditLog.workspaceId],
    references: [workspaces.id],
  }),
}));
