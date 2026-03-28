import { z } from 'zod';

export const createWebhookSchema = z.object({
  channelId: z.string().uuid(),
  name: z.string().min(1).max(100),
});

export const webhookPayloadSchema = z.object({
  content: z.string().min(1).max(4000),
  senderName: z.string().max(100).optional(),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type WebhookPayloadInput = z.infer<typeof webhookPayloadSchema>;
