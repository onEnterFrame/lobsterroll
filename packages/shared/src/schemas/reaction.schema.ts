import { z } from 'zod';

export const addReactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().min(1).max(8),
});

export type AddReactionInput = z.infer<typeof addReactionSchema>;
