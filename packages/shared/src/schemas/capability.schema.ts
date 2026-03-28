import { z } from 'zod';

export const setCapabilitiesSchema = z.object({
  capabilities: z.array(
    z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).nullish(),
      tags: z.array(z.string().max(50)).max(10).default([]),
    }),
  ).max(50),
});

export type SetCapabilitiesInput = z.infer<typeof setCapabilitiesSchema>;
