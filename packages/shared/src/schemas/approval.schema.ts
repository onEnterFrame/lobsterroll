import { z } from 'zod';

export const decideApprovalSchema = z.object({
  decision: z.enum(['approved', 'denied']),
});

export type DecideApprovalInput = z.infer<typeof decideApprovalSchema>;
