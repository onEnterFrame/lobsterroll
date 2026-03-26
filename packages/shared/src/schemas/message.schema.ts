import { z } from 'zod';

export const createMessageSchema = z.object({
  channelId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  payload: z.record(z.unknown()).nullable().default(null),
  threadId: z.string().uuid().nullable().default(null),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        filename: z.string(),
        size: z.number().positive(),
        mimeType: z.string(),
      }),
    )
    .default([]),
  replyTo: z.string().uuid().nullable().default(null),
});

export const listMessagesSchema = z.object({
  channelId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().uuid().optional(),
  threadId: z.string().uuid().optional(),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type ListMessagesInput = z.infer<typeof listMessagesSchema>;
