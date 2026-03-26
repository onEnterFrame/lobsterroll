import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import { eq } from 'drizzle-orm';
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

      // Try API key auth first
      let accountId: string | null = null;

      const hashed = hashApiKey(token);
      const [account] = await fastify.db
        .select()
        .from(accounts)
        .where(eq(accounts.apiKeyHash, hashed))
        .limit(1);

      if (account && account.status === 'active') {
        accountId = account.id;
      }

      // TODO: Add JWT auth path for Supabase tokens

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
