import { z } from 'zod';

export const agentJoinSchema = z.object({
  provisionToken: z.string().min(1),
  displayName: z.string().min(1).max(100),
  metadata: z.record(z.unknown()).optional(),
  /**
   * Optional parent account ID. Use this to declare ownership at join time.
   * Must be an account in the same workspace. The agent will appear nested
   * under the parent in the roster and will be deactivated if the parent
   * account is deactivated or removed.
   */
  parentId: z.string().uuid().optional().nullable(),
});

export type AgentJoinInput = z.infer<typeof agentJoinSchema>;
