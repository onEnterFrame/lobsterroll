import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { invitations, accounts } from '@lobster-roll/db';
import { AppError, ErrorCodes } from '@lobster-roll/shared';
import type { CreateInvitationInput } from '@lobster-roll/shared';
import type { Database } from '@lobster-roll/db';

const INVITATION_EXPIRY_DAYS = 7;

export class InvitationService {
  constructor(private db: Database) {}

  async create(input: CreateInvitationInput, workspaceId: string, invitedBy: string) {
    // Check if user already has an account in this workspace
    const [existing] = await this.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.workspaceId, workspaceId), eq(accounts.ownerId, input.email)))
      .limit(1);

    if (existing) {
      throw new AppError(ErrorCodes.ALREADY_IN_WORKSPACE, 'User already has an account in this workspace', 409);
    }

    // Check for existing pending invitation
    const [existingInvite] = await this.db
      .select({ id: invitations.id })
      .from(invitations)
      .where(
        and(
          eq(invitations.workspaceId, workspaceId),
          eq(invitations.email, input.email),
          eq(invitations.status, 'pending'),
        ),
      )
      .limit(1);

    if (existingInvite) {
      throw new AppError(ErrorCodes.ALREADY_IN_WORKSPACE, 'Pending invitation already exists for this email', 409);
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const [invitation] = await this.db
      .insert(invitations)
      .values({
        workspaceId,
        email: input.email,
        role: input.role,
        invitedBy,
        token,
        status: 'pending',
        expiresAt,
      })
      .returning();

    return invitation;
  }

  async listPending(workspaceId: string) {
    return this.db
      .select()
      .from(invitations)
      .where(and(eq(invitations.workspaceId, workspaceId), eq(invitations.status, 'pending')));
  }

  async getByToken(token: string) {
    const [invitation] = await this.db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);

    if (!invitation) {
      throw new AppError(ErrorCodes.INVITATION_NOT_FOUND, 'Invitation not found', 404);
    }

    return invitation;
  }

  async getPendingByEmail(email: string) {
    return this.db
      .select()
      .from(invitations)
      .where(and(eq(invitations.email, email), eq(invitations.status, 'pending')));
  }

  async markAccepted(id: string) {
    await this.db
      .update(invitations)
      .set({ status: 'accepted' })
      .where(eq(invitations.id, id));
  }

  async revoke(id: string, workspaceId: string) {
    const [invitation] = await this.db
      .select()
      .from(invitations)
      .where(and(eq(invitations.id, id), eq(invitations.workspaceId, workspaceId)))
      .limit(1);

    if (!invitation) {
      throw new AppError(ErrorCodes.INVITATION_NOT_FOUND, 'Invitation not found', 404);
    }

    if (invitation.status !== 'pending') {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Can only revoke pending invitations', 400);
    }

    await this.db
      .update(invitations)
      .set({ status: 'revoked' })
      .where(eq(invitations.id, id));
  }
}
