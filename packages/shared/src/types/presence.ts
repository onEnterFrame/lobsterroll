export const PRESENCE_STATUSES = ['online', 'idle', 'offline', 'dnd'] as const;
export type PresenceStatus = (typeof PRESENCE_STATUSES)[number];

export interface PresenceInfo {
  accountId: string;
  status: PresenceStatus;
  statusMessage: string | null;
  lastSeenAt: string | null;
}
