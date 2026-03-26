import fp from 'fastify-plugin';
import { eq } from 'drizzle-orm';
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

async function resolveAccountFromJwt(fastify: FastifyInstance, token: string) {
  // For Phase 1, we do a simplified JWT check.
  // In production, this would use Supabase Auth to verify the JWT
  // and then resolve the user's account.
  // For now, we look up accounts by the ownerId matching the sub claim.
  if (!fastify.config.SUPABASE_URL || !fastify.config.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Supabase auth not configured', 401);
  }

  // Dynamically import supabase to avoid errors when not configured
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

  const [account] = await fastify.db
    .select()
    .from(accounts)
    .where(eq(accounts.ownerId, user.id))
    .limit(1);

  if (!account) {
    throw new AppError(ErrorCodes.ACCOUNT_NOT_FOUND, 'No account linked to this user', 404);
  }

  return account;
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
    const account = await resolveAccountFromJwt(request.server, token);
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
  },
  { name: 'auth-decorators' },
);
