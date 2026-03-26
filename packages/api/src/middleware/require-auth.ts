import fp from 'fastify-plugin';
import { eq, and } from 'drizzle-orm';
import { accounts } from '@lobster-roll/db';
import { AppError, ErrorCodes } from '@lobster-roll/shared';
import { hashApiKey } from '../utils/api-key.js';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

async function resolveAccountFromApiKey(fastify: FastifyInstance, apiKey: string) {
  const hashed = hashApiKey(apiKey);
  const [account] = await fastify.db
    .select()
    .from(accounts)
    .where(eq(accounts.apiKeyHash, hashed))
    .limit(1);

  if (!account) {
    throw new AppError(ErrorCodes.INVALID_API_KEY, 'Invalid API key', 401);
  }

  if (account.status === 'frozen') {
    throw new AppError(ErrorCodes.ACCOUNT_FROZEN, 'Account is frozen', 403);
  }

  if (account.status === 'deactivated') {
    throw new AppError(ErrorCodes.ACCOUNT_DEACTIVATED, 'Account is deactivated', 403);
  }

  return account;
}

async function resolveAccountFromJwt(
  fastify: FastifyInstance,
  token: string,
  workspaceIdHeader?: string,
) {
  if (!fastify.config.SUPABASE_URL || !fastify.config.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Supabase auth not configured', 401);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    fastify.config.SUPABASE_URL,
    fastify.config.SUPABASE_SERVICE_ROLE_KEY,
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid JWT', 401);
  }

  // Query all active accounts for this user
  const userAccounts = await fastify.db
    .select()
    .from(accounts)
    .where(and(eq(accounts.ownerId, user.id), eq(accounts.status, 'active')));

  if (userAccounts.length === 0) {
    throw new AppError(ErrorCodes.ACCOUNT_NOT_FOUND, 'No account linked to this user', 404);
  }

  // If workspace header provided, filter to that workspace
  if (workspaceIdHeader) {
    const match = userAccounts.find((a) => a.workspaceId === workspaceIdHeader);
    if (!match) {
      throw new AppError(ErrorCodes.ACCOUNT_NOT_FOUND, 'No account in specified workspace', 404);
    }
    return match;
  }

  // Single account — use it
  if (userAccounts.length === 1) {
    return userAccounts[0];
  }

  // Multiple accounts, no header — error
  throw new AppError(
    ErrorCodes.VALIDATION_ERROR,
    'Multiple workspaces found. Set X-Workspace-Id header.',
    400,
  );
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'] as string | undefined;
  const authHeader = request.headers.authorization;

  if (apiKey) {
    const account = await resolveAccountFromApiKey(request.server, apiKey);
    request.currentAccount = {
      id: account.id,
      workspaceId: account.workspaceId,
      displayName: account.displayName,
      accountType: account.accountType,
      permissions: account.permissions as string[],
      status: account.status,
    };
    return;
  }

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const wsHeader = request.headers['x-workspace-id'] as string | undefined;
    const account = await resolveAccountFromJwt(request.server, token, wsHeader);
    request.currentAccount = {
      id: account.id,
      workspaceId: account.workspaceId,
      displayName: account.displayName,
      accountType: account.accountType,
      permissions: account.permissions as string[],
      status: account.status,
    };
    return;
  }

  throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401);
}

export default fp(
  async (fastify: FastifyInstance) => {
    fastify.decorateRequest('currentAccount', null);
    fastify.decorateRequest('workspaceId', null);
    fastify.decorateRequest('supabaseUser', null);
  },
  { name: 'auth-decorators' },
);
