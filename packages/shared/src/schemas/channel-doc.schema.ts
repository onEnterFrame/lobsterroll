import { z } from 'zod';

export const createChannelDocSchema = z.object({
  channelId: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string().max(50_000).default(''),
});

export const updateChannelDocSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(50_000).optional(),
});

export type CreateChannelDocInput = z.infer<typeof createChannelDocSchema>;
export type UpdateChannelDocInput = z.infer<typeof updateChannelDocSchema>;
