import { z } from 'zod';

export const createScheduledMessageSchema = z.object({
  channelId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  scheduledAt: z.string().datetime().optional(),
  cronExpr: z.string().max(100).optional(),
  timezone: z.string().max(50).default('UTC'),
});

export type CreateScheduledMessageInput = z.infer<typeof createScheduledMessageSchema>;
