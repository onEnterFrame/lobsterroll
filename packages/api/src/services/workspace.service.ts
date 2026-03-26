import { eq } from 'drizzle-orm';
import { workspaces } from '@lobster-roll/db';
import { AppError, ErrorCodes } from '@lobster-roll/shared';
import type { CreateWorkspaceInput } from '@lobster-roll/shared';
import type { Database } from '@lobster-roll/db';
import { generateProvisionToken } from '../utils/provision-token.js';

export class WorkspaceService {
  constructor(private db: Database) {}

  async create(input: CreateWorkspaceInput, ownerId: string) {
    // Check slug uniqueness
    const [existing] = await this.db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, input.slug))
      .limit(1);

    if (existing) {
      throw new AppError(ErrorCodes.WORKSPACE_SLUG_TAKEN, 'Workspace slug already taken', 409);
    }

    const [workspace] = await this.db
      .insert(workspaces)
      .values({
        name: input.name,
        slug: input.slug,
        ownerId,
        provisioningMode: input.provisioningMode,
        settings: input.settings,
        agentProvisionToken: generateProvisionToken(),
      })
      .returning();

    return workspace;
  }

  async getById(id: string) {
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .limit(1);

    if (!workspace) {
      throw new AppError(ErrorCodes.WORKSPACE_NOT_FOUND, 'Workspace not found', 404);
    }

    return workspace;
  }
}
