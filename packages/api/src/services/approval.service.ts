import { eq, and } from 'drizzle-orm';
import { approvals } from '@lobster-roll/db';
import { AppError, ErrorCodes } from '@lobster-roll/shared';
import type { CreateAccountInput } from '@lobster-roll/shared';
import type { Database } from '@lobster-roll/db';
import { AccountService } from './account.service.js';

export class ApprovalService {
  constructor(private db: Database) {}

  async getById(id: string) {
    const [approval] = await this.db
      .select()
      .from(approvals)
      .where(eq(approvals.id, id))
      .limit(1);

    if (!approval) {
      throw new AppError(ErrorCodes.APPROVAL_NOT_FOUND, 'Approval not found', 404);
    }

    return approval;
  }

  async listPending(workspaceId: string) {
    return this.db
      .select()
      .from(approvals)
      .where(and(eq(approvals.workspaceId, workspaceId), eq(approvals.status, 'pending')));
  }

  async decide(id: string, decision: 'approved' | 'denied', decidedBy: string) {
    const approval = await this.getById(id);

    if (approval.status !== 'pending') {
      throw new AppError(
        ErrorCodes.APPROVAL_ALREADY_DECIDED,
        `Approval already ${approval.status}`,
        400,
      );
    }

    const [updated] = await this.db
      .update(approvals)
      .set({
        status: decision,
        decidedBy,
        updatedAt: new Date(),
      })
      .where(eq(approvals.id, id))
      .returning();

    // If approved and action is create_account, execute the action
    if (decision === 'approved' && updated.actionType === 'create_account') {
      const actionData = updated.actionData as Record<string, unknown>;
      const accountService = new AccountService(this.db);
      const result = await accountService.create(
        actionData as CreateAccountInput,
        actionData.workspaceId as string,
        updated.requesterId,
        'open', // bypass supervised mode since already approved
      );
      return { approval: updated, result };
    }

    return { approval: updated };
  }
}
