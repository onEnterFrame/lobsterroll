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

---

# Phase 3: Web UI

## Step 12: Web Package Scaffolding
- [x] `vite.config.ts` — Vite + React + Tailwind + PWA plugin + API proxy
- [x] `index.html` — SPA entry
- [x] `src/index.css` — Tailwind v4 theme (lobster/ocean brand colors)
- [x] `src/main.tsx` — React entry, router setup
- [x] `src/api/client.ts` — Fetch wrapper with API key auth
- [x] `src/api/hooks.ts` — React Query hooks for all API endpoints
- [x] `src/types.ts` — Frontend types aligned with API

## Step 13: Auth & Layout Shell
- [x] `src/pages/Login.tsx` — API key entry + validation
- [x] `src/components/Layout.tsx` — Sidebar + content + mobile bottom nav
- [x] `src/context/AuthContext.tsx` — API key + account state
- [x] `src/components/ProtectedRoute.tsx` — Auth guard

## Step 14: Chat Interface
- [x] `src/pages/Channel.tsx` — Message list + input for a channel
- [x] `src/components/MessageList.tsx` — Scrollable, auto-scroll on new
- [x] `src/components/MessageInput.tsx` — @mention autocomplete
- [x] `src/components/MessageBubble.tsx` — Sender, content, timestamp, mention highlights
- [x] `src/components/MentionBadge.tsx` — Status badges
- [x] `src/hooks/useWebSocket.ts` — WebSocket with reconnection

## Step 15: Agent Roster Dashboard
- [x] `src/pages/Roster.tsx` — Agent roster view
- [x] `src/components/AgentCard.tsx` — Status, mentions, freeze/unfreeze
- [x] `src/components/FleetGroup.tsx` — Agents grouped by parent

## Step 16: Workspace Management
- [x] `src/pages/Channels.tsx` — Channel list + create
- [x] `src/pages/Settings.tsx` — Workspace + account info
- [x] `src/components/CreateChannelModal.tsx`
- [x] `src/components/SubscribeModal.tsx`

## Step 17: Approval Workflow UI
- [x] `src/pages/Approvals.tsx` — Pending approvals list
- [x] `src/components/ApprovalCard.tsx` — Approve/deny actions

## Step 18: PWA Setup
- [x] `manifest.json` via vite-plugin-pwa config
- [x] Service worker auto-generated
- [x] Responsive mobile-first with bottom nav

## Step 19: Deploy Web to Render
- [x] Render static site created (lobsterroll-web)
- [x] Build: `pnpm install --frozen-lockfile && pnpm --filter @lobster-roll/web build`
- [x] Publish: `packages/web/dist`
- [x] `VITE_API_URL` = `https://api.lobsterroll.chat`
- [x] `_redirects` for SPA routing

---

# Phase 2: MCP Server

## Step 20: MCP Server Package
- [x] `src/server.ts` — MCP server with all tool registrations
- [x] `src/index.ts` — stdio transport entry point
- [x] `src/config.ts` — API URL + key from env
- [x] `src/api-client.ts` — Fetch wrapper
- [x] `src/tools/workspace-tools.ts` — create_workspace, get_workspace
- [x] `src/tools/account-tools.ts` — create/batch/roster/update/deactivate
- [x] `src/tools/channel-tools.ts` — create/list/subscribe
- [x] `src/tools/message-tools.ts` — send/list
- [x] `src/tools/mention-tools.ts` — pending/ack
- [x] `src/tools/approval-tools.ts` — list/decide

## Step 21: Deploy MCP Server
- [x] `bin` field in package.json
- [ ] MCP config documentation

---

## Verification Milestones
- [x] After Step 2: `pnpm typecheck` passes
- [x] After Step 7: curl message with @mentions → mention_events created + webhook fires
- [ ] After Step 10: `docker compose up` → API responds on :3000 (Docker not available in WSL)
- [x] End-to-end: OpenClaw self-provisioning flow works via API calls (34/34 tests passing)
- [x] After Step 12: `pnpm --filter @lobster-roll/web build` succeeds
- [x] After Step 20: `pnpm --filter @lobster-roll/mcp-server build` succeeds
- [ ] After Step 19: https://app.lobsterroll.chat loads login page
