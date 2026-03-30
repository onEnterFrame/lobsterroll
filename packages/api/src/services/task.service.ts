import { eq, and, desc } from 'drizzle-orm';
import { messageTasks, messages, accounts } from '@lobster-roll/db';
import { AppError, ErrorCodes } from '@lobster-roll/shared';
import type { CreateTaskInput, TaskStatus } from '@lobster-roll/shared';
import type { Database } from '@lobster-roll/db';
import { connectionManager } from './connection-manager.js';

export class TaskService {
  constructor(private db: Database) {}

  async create(input: CreateTaskInput, assignerId: string) {
    // Verify assignee exists and is active
    const [assignee] = await this.db
      .select({ id: accounts.id, status: accounts.status, workspaceId: accounts.workspaceId })
      .from(accounts)
      .where(eq(accounts.id, input.assigneeId))
      .limit(1);

    if (!assignee || assignee.status !== 'active') {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Assignee not found or not active', 404);
    }

    // Verify assigner exists
    const [assigner] = await this.db
      .select({ id: accounts.id, workspaceId: accounts.workspaceId, displayName: accounts.displayName })
      .from(accounts)
      .where(eq(accounts.id, assignerId))
      .limit(1);

    if (!assigner) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Assigner not found', 404);
    }

    // Must be in same workspace
    if (assigner.workspaceId !== assignee.workspaceId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Cannot assign tasks across workspaces', 403);
    }

    // Create the task message in the channel
    const taskContent = `📋 **Task assigned to @${input.assigneeId}**\n${input.title}`;
    const [message] = await this.db
      .insert(messages)
      .values({
        channelId: input.channelId,
        senderId: assignerId,
        content: taskContent,
        mentions: [input.assigneeId],
        payload: { type: 'task' },
      })
      .returning();

    // Create the task record
    const [task] = await this.db
      .insert(messageTasks)
      .values({
        messageId: message.id,
        channelId: input.channelId,
        assignerId,
        assigneeId: input.assigneeId,
        title: input.title,
        status: 'pending',
      })
      .returning();

    // Broadcast task created + message to workspace only
    connectionManager.broadcastToWorkspace(assigner.workspaceId, 'message.new', message);
    connectionManager.broadcastToWorkspace(assigner.workspaceId, 'task.created', task);

    // Notify assignee specifically
    connectionManager.send(input.assigneeId, 'task.assigned', task);

    return task;
  }

  async accept(taskId: string, accountId: string) {
    const task = await this.getAndAuthorize(taskId, accountId);

    if (task.status !== 'pending') {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, `Cannot accept a task that is ${task.status}`, 400);
    }

    const [updated] = await this.db
      .update(messageTasks)
      .set({ status: 'accepted', acceptedAt: new Date() })
      .where(eq(messageTasks.id, taskId))
      .returning();

    const workspaceId = await this.getWorkspaceId(accountId);
    connectionManager.broadcastToWorkspace(workspaceId, 'task.updated', updated);
    return updated;
  }

  async complete(taskId: string, accountId: string, note?: string | null) {
    const task = await this.getAndAuthorize(taskId, accountId);

    if (task.status !== 'accepted' && task.status !== 'pending') {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, `Cannot complete a task that is ${task.status}`, 400);
    }

    const [updated] = await this.db
      .update(messageTasks)
      .set({
        status: 'completed',
        completedAt: new Date(),
        note: note ?? null,
      })
      .where(eq(messageTasks.id, taskId))
      .returning();

    const workspaceId = await this.getWorkspaceId(accountId);
    connectionManager.broadcastToWorkspace(workspaceId, 'task.updated', updated);
    return updated;
  }

  async reject(taskId: string, accountId: string, note?: string | null) {
    const task = await this.getAndAuthorize(taskId, accountId);

    if (task.status !== 'pending' && task.status !== 'accepted') {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, `Cannot reject a task that is ${task.status}`, 400);
    }

    const [updated] = await this.db
      .update(messageTasks)
      .set({
        status: 'rejected',
        rejectedAt: new Date(),
        note: note ?? null,
      })
      .where(eq(messageTasks.id, taskId))
      .returning();

    const workspaceId = await this.getWorkspaceId(accountId);
    connectionManager.broadcastToWorkspace(workspaceId, 'task.updated', updated);
    return updated;
  }

  async listForAssignee(assigneeId: string, status?: TaskStatus) {
    const conditions = [eq(messageTasks.assigneeId, assigneeId)];
    if (status) {
      conditions.push(eq(messageTasks.status, status));
    }

    return this.db
      .select()
      .from(messageTasks)
      .where(and(...conditions))
      .orderBy(desc(messageTasks.createdAt));
  }

  async listForChannel(channelId: string) {
    return this.db
      .select()
      .from(messageTasks)
      .where(eq(messageTasks.channelId, channelId))
      .orderBy(desc(messageTasks.createdAt));
  }

  async getById(taskId: string) {
    const [task] = await this.db
      .select()
      .from(messageTasks)
      .where(eq(messageTasks.id, taskId))
      .limit(1);

    if (!task) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Task not found', 404);
    }

    return task;
  }

  private async getWorkspaceId(accountId: string): Promise<string> {
    const [account] = await this.db
      .select({ workspaceId: accounts.workspaceId })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);
    return account?.workspaceId ?? 'unknown';
  }

  private async getAndAuthorize(taskId: string, accountId: string) {
    const task = await this.getById(taskId);

    // Only the assignee can accept/complete/reject
    if (task.assigneeId !== accountId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Only the assignee can update this task', 403);
    }

    return task;
  }
}
