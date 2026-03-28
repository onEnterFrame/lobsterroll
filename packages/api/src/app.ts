import Fastify from 'fastify';
import type { Config } from './config.js';

// Plugins
import corsPlugin from './plugins/cors.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import multipartPlugin from './plugins/multipart.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import databasePlugin from './plugins/database.js';
import redisPlugin from './plugins/redis.js';
import authDecorators from './middleware/require-auth.js';
import websocketPlugin from './plugins/websocket.js';

// Routes
import healthRoutes from './routes/health.js';
import workspaceRoutes from './routes/workspaces.js';
import accountRoutes from './routes/accounts.js';
import channelRoutes from './routes/channels.js';
import messageRoutes from './routes/messages.js';
import mentionRoutes from './routes/mentions.js';
import fileRoutes from './routes/files.js';
import approvalRoutes from './routes/approvals.js';
import authRoutes from './routes/auth.js';
import invitationRoutes from './routes/invitations.js';
import callbackRoutes from './routes/callbacks.js';
import presenceRoutes from './routes/presence.js';
import taskRoutes from './routes/tasks.js';
import channelDocRoutes from './routes/channel-docs.js';
import webhookRoutes from './routes/webhooks.js';
import approvalRequestRoutes from './routes/approval-requests.js';
import reactionRoutes from './routes/reactions.js';
import scheduledMessageRoutes from './routes/scheduled-messages.js';
import capabilityRoutes from './routes/capabilities.js';
import metricsRoutes from './routes/metrics.js';
import searchRoutes from './routes/search.js';
import dmRoutes from './routes/dm.js';
import readReceiptRoutes from './routes/read-receipts.js';
import savedMessageRoutes from './routes/saved-messages.js';
import messageActionRoutes from './routes/message-actions.js';

// Workers
import { createMentionDeliveryWorker } from './workers/mention-delivery.worker.js';
import { createMentionTimeoutWorker } from './workers/mention-timeout.worker.js';
import { connectionManager } from './services/connection-manager.js';

export async function createApp(config: Config) {
  const app = Fastify({
    logger: {
      level: config.API_LOG_LEVEL,
    },
  });

  // Allow empty body with content-type: application/json
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    if (!body || (typeof body === 'string' && body.trim() === '')) {
      done(null, undefined);
      return;
    }
    try {
      done(null, JSON.parse(body as string));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Attach config
  app.decorate('config', config);

  // Core plugins
  await app.register(corsPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(rateLimitPlugin);
  await app.register(multipartPlugin);

  // Infrastructure plugins
  await app.register(databasePlugin);
  await app.register(redisPlugin);

  // Auth decorators
  await app.register(authDecorators);

  // WebSocket
  await app.register(websocketPlugin);

  // Routes
  await app.register(healthRoutes);
  await app.register(workspaceRoutes);
  await app.register(accountRoutes);
  await app.register(channelRoutes);
  await app.register(messageRoutes);
  await app.register(mentionRoutes);
  await app.register(fileRoutes);
  await app.register(approvalRoutes);
  await app.register(authRoutes);
  await app.register(invitationRoutes);
  await app.register(callbackRoutes);
  await app.register(presenceRoutes);
  await app.register(taskRoutes);
  await app.register(channelDocRoutes);
  await app.register(webhookRoutes);
  await app.register(approvalRequestRoutes);
  await app.register(reactionRoutes);
  await app.register(scheduledMessageRoutes);
  await app.register(capabilityRoutes);
  await app.register(metricsRoutes);
  await app.register(searchRoutes);
  await app.register(dmRoutes);
  await app.register(readReceiptRoutes);
  await app.register(savedMessageRoutes);
  await app.register(messageActionRoutes);

  // Start background workers after all plugins are registered.
  // BullMQ Workers require a dedicated Redis connection with maxRetriesPerRequest: null —
  // the shared app.redis instance uses ioredis defaults which BullMQ rejects.
  app.addHook('onReady', async () => {
    try {
      const { Redis: IORedis } = await import('ioredis');
      const workerRedis = new IORedis(app.config.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });

      workerRedis.on('error', (err) => {
        app.log.error({ err }, 'Worker Redis connection error');
      });

      const deliveryWorker = createMentionDeliveryWorker(workerRedis, app.db, connectionManager);
      const timeoutWorker = createMentionTimeoutWorker(workerRedis, app.db);

      deliveryWorker.on('error', (err) => {
        app.log.error({ err }, 'Mention delivery worker error');
      });
      timeoutWorker.on('error', (err) => {
        app.log.error({ err }, 'Mention timeout worker error');
      });

      app.addHook('onClose', async () => {
        await deliveryWorker.close();
        await timeoutWorker.close();
        await workerRedis.quit();
      });

      app.log.info('Mention delivery and timeout workers started');
    } catch (err) {
      app.log.error({ err }, 'Failed to start mention workers (non-fatal)');
    }
  });

  return app;
}
