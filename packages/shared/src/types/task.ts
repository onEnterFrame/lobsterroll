export const TASK_STATUSES = ['pending', 'accepted', 'completed', 'rejected'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface MessageTask {
  id: string;
  messageId: string;
  channelId: string;
  assignerId: string;
  assigneeId: string;
  title: string;
  status: TaskStatus;
  note: string | null;
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
}
