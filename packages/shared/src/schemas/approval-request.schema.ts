import { z } from 'zod';

export const createApprovalRequestSchema = z.object({
  channelId: z.string().uuid(),
  description: z.string().min(1).max(1000),
  actionType: z.string().min(1).max(100),
  actionData: z.record(z.unknown()).default({}),
});

export type CreateApprovalRequestInput = z.infer<typeof createApprovalRequestSchema>;
