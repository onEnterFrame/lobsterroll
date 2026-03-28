import { z } from 'zod';

export const taskStatusValues = ['pending', 'accepted', 'completed', 'rejected'] as const;

export const createTaskSchema = z.object({
  channelId: z.string().uuid(),
  assigneeId: z.string().uuid(),
  title: z.string().min(1).max(500),
});

export const updateTaskSchema = z.object({
  note: z.string().max(1000).nullish(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
