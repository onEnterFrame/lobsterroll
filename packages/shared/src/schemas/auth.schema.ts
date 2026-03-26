import { z } from 'zod';

export const setupWorkspaceSchema = z.object({
  workspaceName: z.string().min(1).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  displayName: z.string().min(1).max(100),
});

export type SetupWorkspaceInput = z.infer<typeof setupWorkspaceSchema>;
