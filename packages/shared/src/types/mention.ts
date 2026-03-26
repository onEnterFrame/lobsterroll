export const MENTION_STATUSES = [
  'delivered',
  'acknowledged',
  'responded',
  'timed_out',
] as const;
export type MentionStatus = (typeof MENTION_STATUSES)[number];

export interface MentionEvent {
  id: string;
  messageId: string;
  targetId: string;
  status: MentionStatus;
  deliveredAt: Date | null;
  ackedAt: Date | null;
  respondedAt: Date | null;
  timedOutAt: Date | null;
}
