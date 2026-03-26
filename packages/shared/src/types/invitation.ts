export const INVITATION_STATUSES = ['pending', 'accepted', 'expired', 'revoked'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const INVITATION_ROLES = ['member', 'admin'] as const;
export type InvitationRole = (typeof INVITATION_ROLES)[number];

export interface Invitation {
  id: string;
  workspaceId: string;
  email: string;
  role: InvitationRole;
  invitedBy: string | null;
  token: string;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
}
