export const CHANNEL_TYPES = ['text', 'file_drop', 'voice', 'broadcast'] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

export const CHANNEL_VISIBILITIES = ['public', 'private'] as const;
export type ChannelVisibility = (typeof CHANNEL_VISIBILITIES)[number];

export const SUBSCRIPTION_ROLES = ['member', 'admin'] as const;
export type SubscriptionRole = (typeof SUBSCRIPTION_ROLES)[number];

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  channelType: ChannelType;
  visibility: ChannelVisibility;
  topic: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelSubscription {
  channelId: string;
  accountId: string;
  role: SubscriptionRole;
  createdAt: Date;
}
