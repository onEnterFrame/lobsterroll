import type { Database } from '@lobster-roll/db';
import type { Config } from '../config.js';
import type { Redis } from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
    redis: Redis;
    config: Config;
  }

  interface FastifyRequest {
    currentAccount: {
      id: string;
      workspaceId: string;
      displayName: string;
      accountType: 'human' | 'agent' | 'sub_agent';
      permissions: string[];
      status: string;
    } | null;
    workspaceId: string | null;
    supabaseUser: { id: string; email: string } | null;
    _abuseGuardWorkspaceId?: string;
  }
}
