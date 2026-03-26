export const APPROVAL_STATUSES = ['pending', 'approved', 'denied'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export interface Approval {
  id: string;
  workspaceId: string;
  requesterId: string;
  actionType: string;
  actionData: Record<string, unknown>;
  status: ApprovalStatus;
  decidedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
