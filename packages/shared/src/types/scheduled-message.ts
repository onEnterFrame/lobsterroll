export interface ScheduledMessage {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  scheduledAt: string;
  cronExpr: string | null;
  timezone: string;
  enabled: boolean;
  lastSentAt: string | null;
  createdAt: string;
}
