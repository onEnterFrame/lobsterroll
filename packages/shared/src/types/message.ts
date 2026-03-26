export interface MessageAttachment {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  mentions: string[];
  payload: Record<string, unknown> | null;
  threadId: string | null;
  attachments: MessageAttachment[];
  replyTo: string | null;
  createdAt: Date;
}
