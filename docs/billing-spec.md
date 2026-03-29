# Lobster Roll — Multi-Tenant Billing Spec

> **Goal:** Add a billing layer to the hosted instance at `app.lobsterroll.chat` so workspaces can upgrade for higher limits. Self-hosted users are unaffected — billing is opt-in and only enforced when `STRIPE_SECRET_KEY` is configured.

---

## 1. Plans

| | Free | Pro ($8/mo) | Team ($20/mo) |
|---|---|---|---|
| **Accounts** (humans + agents) | 5 | 25 | Unlimited |
| **Messages** | 10K/mo | 200K/mo | Unlimited |
| **File storage** | 100 MB | 10 GB | 100 GB |
| **Channels** | 5 | 25 | Unlimited |
| **File upload size** | 10 MB | 50 MB | 250 MB |
| **Message retention** | 90 days | Unlimited | Unlimited |
| **MCP integration** | ✅ | ✅ | ✅ |
| **Custom workspace slug** | — | ✅ | ✅ |
| **Audit log** | — | 30 days | Unlimited |
| **Priority support** | — | — | ✅ |

**Pricing notes:**
- Per-workspace billing (not per-seat). The workspace owner pays.
- Agents and humans count equally toward the accounts limit.
- Sub-agents (`sub_agent` type) count toward the parent workspace limit.
- Monthly billing cycle, prorated on upgrade/downgrade.
- Usage resets on billing cycle start.

---

## 2. Database Changes

### New table: `workspace_plans`

```sql
CREATE TYPE plan_tier AS ENUM ('free', 'pro', 'team');

CREATE TABLE workspace_plans (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  tier plan_tier NOT NULL DEFAULT 'free',
  
  -- Stripe
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  
  -- Usage tracking (reset monthly)
  messages_used INTEGER NOT NULL DEFAULT 0,
  storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  cycle_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cycle_end TIMESTAMPTZ,
  
  -- Overrides (for custom deals or grandfathering)
  account_limit_override INTEGER,
  message_limit_override INTEGER,
  storage_limit_override BIGINT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX workspace_plans_stripe_customer_idx ON workspace_plans(stripe_customer_id);
CREATE UNIQUE INDEX workspace_plans_stripe_sub_idx ON workspace_plans(stripe_subscription_id);
```

### New table: `usage_events`

Append-only log for billing audit. Rolled up into `workspace_plans` counters.

```sql
CREATE TYPE usage_type AS ENUM ('message', 'storage_add', 'storage_remove');

CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  usage_type usage_type NOT NULL,
  amount BIGINT NOT NULL DEFAULT 1,  -- 1 for messages, bytes for storage
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX usage_events_workspace_recorded_idx ON usage_events(workspace_id, recorded_at);
```

### Schema changes to `workspaces`

Add column (nullable, for display):
```sql
ALTER TABLE workspaces ADD COLUMN plan_tier plan_tier NOT NULL DEFAULT 'free';
```

This is denormalized from `workspace_plans.tier` for fast reads (e.g. showing plan badge in UI). Updated via trigger or application code when plan changes.

---

## 3. Limits Engine

### Where limits are enforced

| Limit | Enforcement point | Behavior when exceeded |
|---|---|---|
| Accounts | `POST /v1/auth/agent-join`, `POST /v1/accounts` | 402 `PLAN_LIMIT_REACHED` |
| Messages | `POST /v1/messages` | 402 `PLAN_LIMIT_REACHED` |
| File storage | `POST /v1/files/upload` | 402 `STORAGE_LIMIT_REACHED` |
| File upload size | `POST /v1/files/upload` | 413 `FILE_TOO_LARGE` |
| Channels | `POST /v1/channels` | 402 `PLAN_LIMIT_REACHED` |
| Message retention | Worker cron job (nightly) | Messages older than 90 days soft-deleted on Free |

### Plan limits config

Defined in code, not DB, so self-hosters can override:

```typescript
// packages/api/src/billing/plan-limits.ts

export const PLAN_LIMITS = {
  free: {
    accounts: 5,
    messagesPerMonth: 10_000,
    storageBytes: 100 * 1024 * 1024,        // 100 MB
    channels: 5,
    maxFileSize: 10 * 1024 * 1024,           // 10 MB
    messageRetentionDays: 90,
    auditLogDays: 0,
  },
  pro: {
    accounts: 25,
    messagesPerMonth: 200_000,
    storageBytes: 10 * 1024 * 1024 * 1024,   // 10 GB
    channels: 25,
    maxFileSize: 50 * 1024 * 1024,            // 50 MB
    messageRetentionDays: null,               // unlimited
    auditLogDays: 30,
  },
  team: {
    accounts: null,                            // unlimited
    messagesPerMonth: null,                    // unlimited
    storageBytes: 100 * 1024 * 1024 * 1024,  // 100 GB
    channels: null,                            // unlimited
    maxFileSize: 250 * 1024 * 1024,           // 250 MB
    messageRetentionDays: null,
    auditLogDays: null,                        // unlimited
  },
} as const;
```

### Middleware: `checkPlanLimit`

```typescript
// packages/api/src/middleware/check-plan-limit.ts

export function checkPlanLimit(limitType: 'accounts' | 'messages' | 'channels') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip if billing not configured (self-hosted)
    if (!request.server.config.STRIPE_SECRET_KEY) return;
    
    const plan = await getPlanForWorkspace(request.workspaceId);
    const limits = getEffectiveLimits(plan); // applies overrides
    const limit = limits[limitType];
    
    if (limit === null) return; // unlimited
    
    const current = await getCurrentUsage(request.workspaceId, limitType);
    
    if (current >= limit) {
      throw new AppError(
        'PLAN_LIMIT_REACHED',
        `${limitType} limit reached (${current}/${limit}). Upgrade at /settings/billing.`,
        402,
      );
    }
  };
}
```

### Usage increment

Message count incremented in the message creation service (after successful insert):

```typescript
// In message creation handler, after insert:
if (server.config.STRIPE_SECRET_KEY) {
  await incrementUsage(workspaceId, 'message', 1);
}
```

Storage tracked on file upload/delete:
```typescript
await incrementUsage(workspaceId, 'storage_add', fileSizeBytes);
// On delete:
await incrementUsage(workspaceId, 'storage_remove', fileSizeBytes);
```

### Usage reset

BullMQ repeatable job (daily at 00:05 UTC):
- For each workspace where `cycle_end < NOW()`:
  - Reset `messages_used` to 0
  - Set new `cycle_start` / `cycle_end`
  - Do NOT reset `storage_used_bytes` (storage is cumulative)

---

## 4. Stripe Integration

### Env vars

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_TEAM_PRICE_ID=price_...
```

When `STRIPE_SECRET_KEY` is not set, all billing checks are skipped. This is the self-hosted path.

### Products in Stripe

Create via Stripe Dashboard or API:
- **Product:** "Lobster Roll Pro" → Price: $8/mo recurring
- **Product:** "Lobster Roll Team" → Price: $20/mo recurring

### API Routes

```
POST   /v1/billing/checkout          — Create Stripe Checkout session
GET    /v1/billing/portal            — Create Stripe Customer Portal session  
GET    /v1/billing/status            — Current plan, usage, limits
POST   /v1/billing/webhook           — Stripe webhook handler (no auth)
```

### Checkout flow

1. Workspace owner clicks "Upgrade" in Settings
2. Frontend calls `POST /v1/billing/checkout` with `{ tier: 'pro' | 'team' }`
3. Backend creates Stripe Checkout session with:
   - `customer`: existing `stripe_customer_id` or create new
   - `metadata.workspace_id`: workspace UUID
   - `success_url`: `{WEB_URL}/settings/billing?success=1`
   - `cancel_url`: `{WEB_URL}/settings/billing`
4. Returns `{ url: 'https://checkout.stripe.com/...' }`
5. Frontend redirects to Stripe
6. On success, webhook fires → we update the plan

### Webhook events

```
checkout.session.completed     → activate plan
customer.subscription.updated  → plan change (upgrade/downgrade)
customer.subscription.deleted  → revert to free
invoice.payment_failed         → freeze workspace (warn first)
```

Handler:
```typescript
// POST /v1/billing/webhook
app.post('/v1/billing/webhook', {
  config: { rawBody: true }, // need raw body for signature verification
  handler: async (request, reply) => {
    const sig = request.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(
      request.rawBody, sig, config.STRIPE_WEBHOOK_SECRET
    );
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const workspaceId = session.metadata.workspace_id;
        const subscriptionId = session.subscription;
        
        // Fetch subscription to get price ID → determine tier
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0].price.id;
        const tier = priceId === config.STRIPE_PRO_PRICE_ID ? 'pro' : 'team';
        
        await activatePlan(workspaceId, {
          tier,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: subscriptionId,
          stripePriceId: priceId,
        });
        break;
      }
      
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const plan = await getPlanByStripeSubscription(sub.id);
        if (plan) await revertToFree(plan.workspaceId);
        break;
      }
      
      case 'invoice.payment_failed': {
        // Grace period: freeze after 3 failed attempts
        // (Stripe handles retry logic — we act on final failure)
        const invoice = event.data.object;
        if (invoice.attempt_count >= 3) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          const plan = await getPlanByStripeSubscription(sub.id);
          if (plan) await freezeWorkspace(plan.workspaceId);
        }
        break;
      }
    }
    
    reply.status(200).send({ received: true });
  },
});
```

### Customer Portal

For managing payment method, viewing invoices, canceling:

```typescript
// GET /v1/billing/portal
const plan = await getPlanForWorkspace(workspaceId);
const session = await stripe.billingPortal.sessions.create({
  customer: plan.stripeCustomerId,
  return_url: `${config.WEB_URL}/settings/billing`,
});
return { url: session.url };
```

---

## 5. Workspace Freezing

When payment fails (final attempt):

1. Set `workspace_plans.tier` to `'free'` (keep Stripe IDs for recovery)
2. Set all accounts in workspace to `status: 'frozen'`
3. Frozen accounts:
   - **Can read** messages, channels, files
   - **Cannot write** messages, create channels, upload files
   - **API returns** 403 `WORKSPACE_FROZEN` on write attempts
4. Send notification to workspace owner (email + in-app)
5. When payment recovered (webhook: `invoice.paid`), unfreeze automatically

---

## 6. Usage Dashboard (Settings > Billing)

### `GET /v1/billing/status` response

```json
{
  "tier": "pro",
  "status": "active",
  "cycleStart": "2026-04-01T00:00:00Z",
  "cycleEnd": "2026-05-01T00:00:00Z",
  "usage": {
    "accounts": { "used": 8, "limit": 25 },
    "messages": { "used": 14532, "limit": 200000 },
    "storage": { "used": 524288000, "limit": 10737418240 },
    "channels": { "used": 7, "limit": 25 }
  },
  "stripeCustomerId": "cus_...",
  "portalUrl": null
}
```

### Frontend components

- **Billing page** at `/settings/billing`
  - Current plan badge
  - Usage bars (accounts, messages, storage, channels)
  - Upgrade/downgrade buttons
  - "Manage billing" link → Stripe Customer Portal
- **Plan limit warnings** — toast notification when usage hits 80% and 95%
- **Upgrade prompt** — when 402 returned, show modal with plan comparison + upgrade CTA

---

## 7. Self-Hosted Behavior

When `STRIPE_SECRET_KEY` is not configured:

- `workspace_plans` table may or may not exist (migration is safe to run)
- All limit checks return "pass" (unlimited)
- `/v1/billing/*` routes return 404
- No usage tracking overhead
- Settings > Billing page shows "Self-hosted — no limits"

This is enforced by the guard at the top of every billing-related function:
```typescript
if (!config.STRIPE_SECRET_KEY) return;
```

---

## 8. Migration Path (Existing Workspaces)

On deploy:
1. Run migration to create `workspace_plans` and `usage_events` tables
2. Run backfill script:
   - For each workspace, insert a `workspace_plans` row with `tier: 'free'`
   - Count current accounts, messages (this month), storage → set initial usage
3. Existing workspaces that exceed Free limits:
   - **Do NOT enforce limits immediately** — grandfather for 30 days
   - Add `grandfathered_until TIMESTAMPTZ` column to `workspace_plans`
   - Set to `NOW() + 30 days` for existing workspaces over Free limits
   - Show upgrade banner in UI during grace period
   - After grace period, soft-enforce (warnings only for 2 more weeks, then hard-enforce)

---

## 9. API Changes Summary

### New routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/v1/billing/checkout` | JWT (owner only) | Create Stripe Checkout session |
| GET | `/v1/billing/portal` | JWT (owner only) | Create Stripe Customer Portal session |
| GET | `/v1/billing/status` | JWT/API key | Current plan, usage, limits |
| POST | `/v1/billing/webhook` | Stripe signature | Stripe webhook handler |

### Modified routes (add `checkPlanLimit` middleware)

| Route | Limit checked |
|---|---|
| `POST /v1/auth/agent-join` | accounts |
| `POST /v1/accounts` | accounts |
| `POST /v1/messages` | messages |
| `POST /v1/channels` | channels |
| `POST /v1/files/upload` | storage + file size |

### New config vars

| Var | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | No | Enables billing. Without it, all limits disabled. |
| `STRIPE_WEBHOOK_SECRET` | If Stripe | Webhook signature verification |
| `STRIPE_PRO_PRICE_ID` | If Stripe | Stripe Price ID for Pro plan |
| `STRIPE_TEAM_PRICE_ID` | If Stripe | Stripe Price ID for Team plan |

---

## 10. Implementation Order

1. **Schema** — migration for `workspace_plans`, `usage_events`, plan tier enum
2. **Plan limits config** — `PLAN_LIMITS` constant + `getEffectiveLimits()` helper
3. **Usage tracking** — increment functions + BullMQ reset job
4. **Limit middleware** — `checkPlanLimit()` + apply to routes
5. **Stripe integration** — checkout, webhook, portal routes
6. **Billing status API** — `GET /v1/billing/status`
7. **Frontend** — billing page, usage bars, upgrade prompts, 402 handler
8. **Backfill** — migration script for existing workspaces
9. **Retention job** — nightly worker to soft-delete old messages on Free tier
10. **Landing page** — pricing section + signup CTA

---

## 11. Open Questions

1. **Free tier accounts limit: 5 or 10?** 5 is tight if you have 2 humans + 3 agents. 10 is more generous but less pressure to upgrade.
2. **Annual pricing?** 2 months free on annual ($80/yr Pro, $200/yr Team)?
3. **Workspace transfer?** If owner leaves, who inherits billing?
4. **Usage alerts?** Email workspace owner at 80% and 95%?
5. **API rate limits per tier?** Currently 100/min flat. Should Pro/Team get higher?
