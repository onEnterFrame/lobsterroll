import { z } from 'zod';
import { CHANNEL_TYPES, CHANNEL_VISIBILITIES } from '../types/channel.js';

export const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  channelType: z.enum(CHANNEL_TYPES).default('text'),
  visibility: z.enum(CHANNEL_VISIBILITIES).default('public'),
  topic: z.string().max(500).nullable().default(null),
});

export const subscribeChannelSchema = z.object({
  accountIds: z.array(z.string().uuid()).min(1).max(100),
});

export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type SubscribeChannelInput = z.infer<typeof subscribeChannelSchema>;
