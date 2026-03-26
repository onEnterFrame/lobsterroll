# Lobster Roll — Phase 1 Implementation Tracker

## Step 0: Project Scaffolding
- [x] `pnpm-workspace.yaml`
- [x] Root `package.json` (scripts: dev:api, build, test, db:generate, db:migrate)
- [x] `tsconfig.base.json` (ES2022, NodeNext, strict)
- [x] `.npmrc`, `.gitignore`, `.env.example`, `.prettierrc`
- [x] Root `vitest.config.ts`
- [x] Create directory structure (`packages/{shared,db,api,mcp-server,web,cli}/src`, `docker`, `.github/workflows`)
- [x] Initialize each package with `package.json` + `tsconfig.json`

## Step 1: Shared Package (`packages/shared`)
- [x] `src/types/` — workspace, account, channel, message, approval, agent-callback, permissions
- [x] `src/schemas/` — Zod schemas for all create/update operations
- [x] `src/constants/` — defaults, permissions, errors
- [x] `src/utils/` — mention-parser, slug
- [x] Package build config + exports

## Step 2: Database Package (`packages/db`)
- [x] Drizzle schema: workspaces table
- [x] Drizzle schema: accounts table (with enums)
- [x] Drizzle schema: channels + channel_subscriptions tables
- [x] Drizzle schema: messages table
- [x] Drizzle schema: mention_events table
- [x] Drizzle schema: agent_callbacks table
- [x] Drizzle schema: approvals table
- [x] Drizzle schema: audit_log table
- [x] `src/relations.ts` — Drizzle relational queries
- [x] `src/client.ts` — `createDb()` factory
- [x] `drizzle.config.ts`
- [x] `scripts/migrate.ts`, `scripts/seed.ts`

## Step 3: API Server Foundation (`packages/api`)
- [x] `src/app.ts` — Fastify app factory with plugin registration
- [x] `src/index.ts` — entry point
- [x] `src/config.ts` — env validation
- [x] `src/plugins/database.ts`
- [x] `src/plugins/redis.ts`
- [x] `src/plugins/cors.ts`
- [x] `src/plugins/rate-limit.ts`
- [x] `src/plugins/multipart.ts`
- [x] `src/plugins/error-handler.ts`
- [x] `src/types/fastify.d.ts` — type augmentation
- [x] `src/routes/health.ts` — GET /health, GET /ready

## Step 4: Authentication System
- [x] `src/middleware/require-auth.ts` — JWT + API key dual auth
- [x] `src/middleware/require-permission.ts` — scope checking
- [x] `src/middleware/workspace-context.ts` — resolve workspace
- [x] `src/utils/api-key.ts` — generateApiKey (raw + hashed)
- [x] Auth plugin (`src/plugins/auth.ts`) — preHandler hook registration

## Step 5: Workspaces + Accounts
- [x] `src/services/workspace.service.ts`
- [x] `src/services/account.service.ts` — parent chain, cascade deactivation, fleet limits
- [x] `src/routes/workspaces.ts` — POST /v1/workspaces
- [x] `src/routes/accounts.ts` — CRUD + batch + roster
- [x] API key auto-generation for agent accounts
- [x] Supervised mode → approval creation

## Step 6: Channels + Subscriptions
- [x] `src/services/channel.service.ts`
- [x] `src/routes/channels.ts` — POST /v1/channels, GET /v1/channels, POST /v1/channels/:id/subscribe

## Step 7: Messages + Mention Routing Engine (CORE)
- [x] `src/services/message.service.ts` — send pipeline (validate, parse mentions, insert, enqueue)
- [x] `src/routes/messages.ts` — POST /v1/messages, GET /v1/messages
- [x] `src/routes/mentions.ts` — GET /v1/mentions/pending, POST /v1/mentions/:id/ack
- [x] `src/workers/mention-delivery.worker.ts` — BullMQ webhook/ws/poll delivery, 3 retries
- [x] `src/workers/mention-timeout.worker.ts` — timeout + escalation to parent human

## Step 8: File Upload + Approvals
- [x] `src/services/file-storage.ts` — abstract provider (S3/MinIO)
- [x] `src/routes/files.ts` — POST /v1/files/upload
- [x] `src/services/approval.service.ts`
- [x] `src/routes/approvals.ts` — POST /v1/approvals/:id/approve|deny

## Step 9: WebSocket Events
- [x] `src/plugins/websocket.ts` — ws connection with auth
- [x] `src/services/connection-manager.ts` — in-memory Map<accountId, WebSocket>
- [x] Events: message.new, mention.received, mention.timeout, agent.status_change, approval.requested

## Step 10: Docker Compose
- [x] `docker/api.Dockerfile` (multi-stage Node build)
- [x] `docker-compose.yml` (API, Postgres, Redis, MinIO)
- [x] `docker-compose.dev.yml` (hot-reload volumes)
- [ ] Verify `docker compose up` starts all services

## Step 11: CI/CD
- [x] `.github/workflows/ci.yml` — PR: install → typecheck → lint → test → build
- [x] Postgres + Redis service containers for integration tests

## Verification Milestones
- [x] After Step 2: `pnpm typecheck` passes
- [x] After Step 7: curl message with @mentions → mention_events created + webhook fires
- [ ] After Step 10: `docker compose up` → API responds on :3000 (Docker not available in WSL)
- [x] End-to-end: OpenClaw self-provisioning flow works via API calls (34/34 tests passing)
