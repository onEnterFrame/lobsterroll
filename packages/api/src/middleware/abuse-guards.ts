/**
 * Abuse protection guards — lightweight limits to prevent runaway usage.
 * NOT billing. Just sane defaults for a free beta.
 *
 * Limits:
 *   - 1 workspace per Supabase user
 *   - 50 accounts per workspace
 *   - 50 MB max file upload size
 *   - 500 MB total storage per workspace
 *
 * Override via env vars:
 *   - LR_MAX_WORKSPACES_PER_USER (default: 1)
 *   - LR_MAX_ACCOUNTS_PER_WORKSPACE (default: 50)
 *   - LR_MAX_FILE_SIZE_MB (default: 50)
 *   - LR_MAX_STORAGE_MB (default: 500)
 *   - LR_DISABLE_ABUSE_GUARDS (set to "true" to skip all checks — self-hosted)
 */
import { eq, and, sql } from 'drizzle-orm';
import { accounts, workspaces } from '@lobster-roll/db';
import { AppError, ErrorCodes } from '@lobster-roll/shared';
import type { FastifyRequest, FastifyReply } from 'fastify';

// ── Config (read once at import) ──

const DISABLED = process.env.LR_DISABLE_ABUSE_GUARDS === 'true';
const MAX_WORKSPACES_PER_USER = parseInt(process.env.LR_MAX_WORKSPACES_PER_USER ?? '1', 10);
const MAX_ACCOUNTS_PER_WORKSPACE = parseInt(process.env.LR_MAX_ACCOUNTS_PER_WORKSPACE ?? '50', 10);
const MAX_FILE_SIZE_BYTES = parseInt(process.env.LR_MAX_FILE_SIZE_MB ?? '50', 10) * 1024 * 1024;
const MAX_STORAGE_BYTES = parseInt(process.env.LR_MAX_STORAGE_MB ?? '500', 10) * 1024 * 1024;

// ── Guards ──

/**
 * Prevents a single Supabase user from creating too many workspaces.
 * Use as preHandler on POST /v1/auth/setup-workspace.
 */
export async function guardWorkspaceCreation(request: FastifyRequest, _reply: FastifyReply) {
  if (DISABLED) return;

  const supabaseUserId = request.supabaseUser?.id;
  if (!supabaseUserId) return; // auth middleware will catch this

  const [result] = await request.server.db
    .select({ count: sql<number>`count(*)::int` })
    .from(workspaces)
    .where(eq(workspaces.ownerId, supabaseUserId));

  if (result.count >= MAX_WORKSPACES_PER_USER) {
    throw new AppError(
      ErrorCodes.FORBIDDEN,
      `Workspace limit reached (${MAX_WORKSPACES_PER_USER}). ` +
        'During beta, each account can create one workspace. Need more? Open an issue on GitHub.',
      403,
    );
  }
}

/**
 * Prevents a workspace from having too many accounts.
 * Use as preHandler on POST /v1/accounts, POST /v1/accounts/batch, POST /v1/auth/agent-join.
 */
export async function guardAccountCreation(request: FastifyRequest, _reply: FastifyReply) {
  if (DISABLED) return;

  // For agent-join, workspace ID comes from the provision token lookup (not middleware).
  // We'll get it from workspaceId or body.
  const workspaceId = request.workspaceId ?? (request as any)._abuseGuardWorkspaceId;
  if (!workspaceId) return; // will be caught by route logic

  const [result] = await request.server.db
    .select({ count: sql<number>`count(*)::int` })
    .from(accounts)
    .where(
      and(eq(accounts.workspaceId, workspaceId), eq(accounts.status, 'active')),
    );

  if (result.count >= MAX_ACCOUNTS_PER_WORKSPACE) {
    throw new AppError(
      ErrorCodes.FORBIDDEN,
      `Account limit reached (${MAX_ACCOUNTS_PER_WORKSPACE} per workspace). ` +
        'Need more during beta? Open an issue on GitHub.',
      403,
    );
  }
}

/**
 * Checks file size against max upload limit.
 * Call AFTER reading the file buffer in the upload handler.
 */
export function guardFileSize(sizeBytes: number): void {
  if (DISABLED) return;

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    const maxMb = Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024);
    const actualMb = (sizeBytes / 1024 / 1024).toFixed(1);
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      `File too large (${actualMb} MB). Max upload size is ${maxMb} MB during beta.`,
      413,
    );
  }
}

/**
 * Checks total workspace storage against limit.
 * Call BEFORE saving the file. Requires a DB query.
 *
 * NOTE: This is approximate — we don't track exact storage in a counter yet.
 * It queries Supabase Storage bucket usage or falls back to summing file sizes
 * from message attachments. For beta, the attachments-based estimate is fine.
 */
export async function guardStorageLimit(
  db: any,
  workspaceId: string,
  additionalBytes: number,
): Promise<void> {
  if (DISABLED) return;

  // Estimate storage from message attachments (jsonb → sum sizes)
  const [result] = await db.execute(sql`
    SELECT COALESCE(SUM(
      (SELECT COALESCE(SUM((a->>'size')::bigint), 0)
       FROM jsonb_array_elements(m.attachments) a)
    ), 0)::bigint AS total_bytes
    FROM messages m
    JOIN channels c ON c.id = m.channel_id
    WHERE c.workspace_id = ${workspaceId}
    AND m.attachments != '[]'::jsonb
  `);

  const currentBytes = Number(result?.total_bytes ?? 0);
  if (currentBytes + additionalBytes > MAX_STORAGE_BYTES) {
    const maxMb = Math.round(MAX_STORAGE_BYTES / 1024 / 1024);
    const usedMb = Math.round(currentBytes / 1024 / 1024);
    throw new AppError(
      ErrorCodes.FORBIDDEN,
      `Storage limit reached (${usedMb}/${maxMb} MB). ` +
        'Need more during beta? Open an issue on GitHub.',
      403,
    );
  }
}

// ── Exports for config inspection ──

export const ABUSE_GUARD_LIMITS = {
  maxWorkspacesPerUser: MAX_WORKSPACES_PER_USER,
  maxAccountsPerWorkspace: MAX_ACCOUNTS_PER_WORKSPACE,
  maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
  maxStorageBytes: MAX_STORAGE_BYTES,
  disabled: DISABLED,
} as const;
