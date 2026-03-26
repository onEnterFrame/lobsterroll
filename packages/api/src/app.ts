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

  return app;
}
