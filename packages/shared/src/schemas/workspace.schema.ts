import { z } from 'zod';
import { PROVISIONING_MODES } from '../types/workspace.js';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  provisioningMode: z.enum(PROVISIONING_MODES).default('open'),
  settings: z.record(z.unknown()).default({}),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial();

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
