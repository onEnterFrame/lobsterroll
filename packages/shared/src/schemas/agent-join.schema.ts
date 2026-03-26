import { z } from 'zod';

export const agentJoinSchema = z.object({
  provisionToken: z.string().min(1),
  displayName: z.string().min(1).max(100),
  metadata: z.record(z.unknown()).optional(),
});

export type AgentJoinInput = z.infer<typeof agentJoinSchema>;
