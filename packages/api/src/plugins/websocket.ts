import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import { eq, and } from 'drizzle-orm';
import { accounts } from '@lobster-roll/db';
import { hashApiKey } from '../utils/api-key.js';
import { connectionManager } from '../services/connection-manager.js';
import type { FastifyInstance } from 'fastify';

export default fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(websocket);

    fastify.get('/ws/events', { websocket: true }, async (socket, request) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        socket.close(4001, 'Authentication required');
        return;
      }

      let accountId: string | null = null;

      // Try API key auth first (lr_ prefix)
      if (token.startsWith('lr_')) {
        const hashed = hashApiKey(token);
        const [account] = await fastify.db
          .select()
          .from(accounts)
          .where(eq(accounts.apiKeyHash, hashed))
          .limit(1);

        if (account && account.status === 'active') {
          accountId = account.id;
        }
      } else {
        // Try JWT auth (Supabase token)
        try {
          if (fastify.config.SUPABASE_URL && fastify.config.SUPABASE_SERVICE_ROLE_KEY) {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
              fastify.config.SUPABASE_URL,
              fastify.config.SUPABASE_SERVICE_ROLE_KEY,
            );

            const {
              data: { user },
            } = await supabase.auth.getUser(token);

            if (user) {
              // Find first active account for this user
              const userAccounts = await fastify.db
                .select()
                .from(accounts)
                .where(and(eq(accounts.ownerId, user.id), eq(accounts.status, 'active')))
                .limit(1);

              if (userAccounts.length > 0) {
                accountId = userAccounts[0].id;
              }
            }
          }
        } catch {
          // JWT verification failed — will close below
        }
      }

      if (!accountId) {
        socket.close(4001, 'Invalid token');
        return;
      }

      connectionManager.add(accountId, socket);
      fastify.log.info(`WebSocket connected: ${accountId}`);

      socket.on('close', () => {
        connectionManager.remove(accountId!, socket);
        fastify.log.info(`WebSocket disconnected: ${accountId}`);
      });

      socket.on('message', (msg) => {
        // Handle ping/pong for keepalive
        try {
          const data = JSON.parse(msg.toString());
          if (data.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }));
          }
        } catch {
          // Ignore invalid messages
        }
      });
    });
  },
  { name: 'websocket-events', dependencies: ['database'] },
);
