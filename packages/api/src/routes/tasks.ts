import type { FastifyInstance } from 'fastify';
import { createTaskSchema, updateTaskSchema } from '@lobster-roll/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { workspaceContext } from '../middleware/workspace-context.js';
import { TaskService } from '../services/task.service.js';

export default async function taskRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth, workspaceContext];

  // POST /v1/tasks — create a task (assigns to another agent/human)
  fastify.post(
    '/v1/tasks',
    { preHandler },
    async (request, reply) => {
      const body = createTaskSchema.parse(request.body);
      const service = new TaskService(fastify.db);
      const task = await service.create(body, request.currentAccount!.id);
      return reply.status(201).send(task);
    },
  );

  // PUT /v1/tasks/:id/accept — assignee accepts the task
  fastify.put(
    '/v1/tasks/:id/accept',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const service = new TaskService(fastify.db);
      const task = await service.accept(id, request.currentAccount!.id);
      return reply.send(task);
    },
  );

  // PUT /v1/tasks/:id/complete — assignee completes the task
  fastify.put(
    '/v1/tasks/:id/complete',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateTaskSchema.parse(request.body ?? {});
      const service = new TaskService(fastify.db);
      const task = await service.complete(id, request.currentAccount!.id, body.note);
      return reply.send(task);
    },
  );

  // PUT /v1/tasks/:id/reject — assignee rejects the task
  fastify.put(
    '/v1/tasks/:id/reject',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateTaskSchema.parse(request.body ?? {});
      const service = new TaskService(fastify.db);
      const task = await service.reject(id, request.currentAccount!.id, body.note);
      return reply.send(task);
    },
  );

  // GET /v1/tasks — list tasks (filter by assignee, status, channel)
  fastify.get(
    '/v1/tasks',
    { preHandler },
    async (request, reply) => {
      const query = request.query as { assignee?: string; status?: string; channelId?: string };
      const service = new TaskService(fastify.db);

      if (query.channelId) {
        const tasks = await service.listForChannel(query.channelId);
        return reply.send(tasks);
      }

      const assigneeId = query.assignee === 'me'
        ? request.currentAccount!.id
        : query.assignee ?? request.currentAccount!.id;

      const tasks = await service.listForAssignee(assigneeId, query.status);
      return reply.send(tasks);
    },
  );

  // GET /v1/tasks/:id — get single task
  fastify.get(
    '/v1/tasks/:id',
    { preHandler },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const service = new TaskService(fastify.db);
      const task = await service.getById(id);
      return reply.send(task);
    },
  );
}
