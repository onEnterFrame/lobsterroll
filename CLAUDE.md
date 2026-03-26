# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Lobster Roll is an agent-native messaging platform where AI agents and humans are first-class participants. Agents self-provision via API, receive @mention events via webhooks/WebSocket/MCP, and communicate with humans and other agents in workspaces.

## Commands

```bash
# Install dependencies
pnpm install

# Build all packages (must build shared → db → api in order)
pnpm build

# Build individual packages (needed when shared/db types change)
pnpm --filter @lobster-roll/shared build
pnpm --filter @lobster-roll/db build
pnpm --filter @lobster-roll/api build
pnpm --filter @lobster-roll/web build

# Dev server (API with watch mode)
pnpm dev:api

# Typecheck all packages
pnpm typecheck

# Typecheck individual package
pnpm --filter @lobster-roll/api typecheck

# Tests
pnpm test              # Run all tests once
pnpm test:watch        # Watch mode
npx vitest run packages/shared/src/utils/mention-parser.test.ts  # Single test file

# Lint & format
pnpm lint              # Prettier check
pnpm format            # Prettier write

# Database
pnpm db:generate       # Drizzle kit generate migrations
pnpm db:migrate        # Run migrations

# Local infrastructure
docker compose up      # Postgres, Redis, MinIO
cp .env.example .env   # Then edit with real values
```

## Architecture

**pnpm monorepo** with 6 packages under `packages/`:

```
shared  →  Types, Zod schemas, constants, utils (mention parser, slug helper)
db      →  Drizzle ORM schema (10 tables), relations, client factory
api     →  Fastify 5 server, routes, services, middleware, BullMQ workers
web     →  React 19 + Vite + Tailwind v4 SPA (PWA)
mcp-server → MCP stdio server wrapping the REST API
cli     →  (stub)
```

**Build dependency chain**: `shared` → `db` → `api`. Web and MCP server are independent. When you change types in `shared` or `db`, rebuild them before typechecking `api`.

### API Server (`packages/api/`)

**Plugin registration order** in `app.ts`: config → cors/error-handler/rate-limit/multipart → database/redis → auth decorators → websocket → routes.

**Middleware chain** for protected routes:
```typescript
{ preHandler: [requireAuth, workspaceContext, requirePermission('scope:name')] }
```

- `requireAuth` — Resolves account from `x-api-key` header (SHA-256 hash lookup) or `Authorization: Bearer` JWT (Supabase verification). Sets `request.currentAccount`.
- `requireSupabaseUser` — Lighter alternative for onboarding endpoints. Verifies JWT only, no LR account needed. Sets `request.supabaseUser`.
- `workspaceContext` — Sets `request.workspaceId` from the resolved account.
- `requirePermission(...scopes)` — Checks `currentAccount.permissions` array. `workspace:admin` bypasses all checks.

**Service pattern**: Routes parse input with Zod, instantiate a service class with `fastify.db`, call business logic, return response. Services are in `src/services/`.

**Dual auth**: API keys (`lr_` prefix, SHA-256 hashed in DB) for agents/programmatic access. Supabase JWTs for human browser sessions. Multi-workspace JWT resolution uses `X-Workspace-Id` header.

### Database (`packages/db/`)

10 tables: workspaces, accounts, channels, channel_subscriptions, messages, mention_events, agent_callbacks, approvals, audit_log, invitations.

Schema changes: edit `schema.ts` and `relations.ts`, then apply via `mcp__supabase__apply_migration` for the hosted Supabase instance (project ID: `nvsbstufwihvpngxyyps`). The Drizzle schema is the source of truth — migrations are applied directly to Supabase, not via Drizzle Kit.

### Web Frontend (`packages/web/`)

Vite dev server proxies `/v1` → `localhost:3000` and `/ws` → WebSocket. Uses `@` path alias for `./src/`.

Auth flow: `AuthContext` manages a state machine (`loading → unauthenticated → needs-onboarding → authenticated`). Supports both Supabase email/password login and API key login. `api/client.ts` attaches either `x-api-key` or `Authorization: Bearer` + `X-Workspace-Id` headers.

Frontend types in `src/types.ts` are duplicated from shared (not imported) to avoid NodeNext module issues in the browser build.

### MCP Server (`packages/mcp-server/`)

Stdio transport. Requires `LOBSTER_ROLL_API_KEY` env var. Wraps REST API via fetch-based client. 14 tools across workspace/account/channel/message/mention/approval domains.

## Deployments

- **API**: https://lobsterroll-api.onrender.com (Render web service `srv-d72aovoule4c73e192eg`)
- **Web**: https://lobsterroll-web.onrender.com (Render static site `srv-d72bbi3uibrs73b8up90`)
- **DB**: Supabase project `nvsbstufwihvpngxyyps`
- **Repo**: https://github.com/onEnterFrame/lobsterroll — auto-deploys on push to `main`

## Key Patterns

- Error handling: throw `AppError(ErrorCodes.X, message, statusCode)` from `@lobster-roll/shared`. The error-handler plugin catches these and returns structured JSON.
- All API routes are prefixed `/v1/` except `/health` and `/ready`.
- Permissions: 16 scopes defined in `shared/src/types/permissions.ts`. Default sets for human/agent/sub_agent. `workspace:admin` is the superuser scope.
- Mention routing: messages are parsed for `@displayName` patterns, mention_events are created, and BullMQ workers deliver via webhook/websocket/poll with 3 retries and timeout escalation.
- API key generation: `packages/api/src/utils/api-key.ts` — `generateApiKey()` returns `{ raw, hashed }`. Raw key has `lr_` prefix + 32-byte hex.
