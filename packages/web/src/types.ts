// Frontend types aligned with the API responses.
// We don't import from @lobster-roll/shared to avoid NodeNext module issues in the browser build.

export type ProvisioningMode = 'open' | 'supervised' | 'locked';
export type AccountType = 'human' | 'agent' | 'sub_agent';
export type AuthMethod = 'supabase' | 'api_key';
export type AccountStatus = 'active' | 'frozen' | 'deactivated';
export type ChannelType = 'text' | 'file_drop' | 'voice' | 'broadcast';
export type ChannelVisibility = 'public' | 'private';
export type SubscriptionRole = 'member' | 'admin';
export type MentionStatus = 'delivered' | 'acknowledged' | 'responded' | 'timed_out';
export type ApprovalStatus = 'pending' | 'approved' | 'denied';
export type PresenceStatus = 'online' | 'idle' | 'offline' | 'dnd';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  provisioningMode: ProvisioningMode;
  agentProvisionToken: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  workspaceId: string;
  displayName: string;
  accountType: AccountType;
  parentId: string | null;
  ownerId: string | null;
  authMethod: AuthMethod;
  status: AccountStatus;
  permissions: string[];
  metadata: Record<string, unknown>;
  presenceStatus: PresenceStatus;
  statusMessage: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  channelType: ChannelType;
  visibility: ChannelVisibility;
  topic: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  mentions: string[];
  payload: Record<string, unknown> | null;
  threadId: string | null;
  attachments: MessageAttachment[];
  replyTo: string | null;
  createdAt: string;
}

export interface MessageAttachment {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface MentionEvent {
  id: string;
  messageId: string;
  targetId: string;
  status: MentionStatus;
  deliveredAt: string | null;
  ackedAt: string | null;
  respondedAt: string | null;
  timedOutAt: string | null;
}

export interface Approval {
  id: string;
  workspaceId: string;
  requesterId: string;
  actionType: string;
  actionData: Record<string, unknown>;
  status: ApprovalStatus;
  decidedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type InvitationRole = 'member' | 'admin';

export interface Invitation {
  id: string;
  workspaceId: string;
  email: string;
  role: InvitationRole;
  invitedBy: string | null;
  token: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface PresenceInfo {
  accountId: string;
  status: PresenceStatus;
  statusMessage: string | null;
  lastSeenAt: string | null;
}

// Roster API returns accounts grouped by parent
export interface RosterEntry extends Account {
  children?: Account[];
}

// WebSocket event types
export type WsEvent =
  | { type: 'message.new'; data: Message }
  | { type: 'mention.new'; data: MentionEvent }
  | { type: 'approval.requested'; data: Approval }
  | { type: 'account.updated'; data: Account }
  | { type: 'presence.changed'; data: PresenceInfo }
  | { type: 'pong' };
