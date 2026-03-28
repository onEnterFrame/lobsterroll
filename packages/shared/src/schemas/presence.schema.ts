import { z } from 'zod';

export const presenceStatusValues = ['online', 'idle', 'offline', 'dnd'] as const;

export const updatePresenceSchema = z.object({
  status: z.enum(presenceStatusValues),
  statusMessage: z.string().max(128).nullish(),
});

export type UpdatePresenceInput = z.infer<typeof updatePresenceSchema>;
