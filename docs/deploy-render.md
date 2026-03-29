# Deploy to Render + Supabase

This guide walks through deploying Lobster Roll on Render (API + Web) with Supabase (Database + Storage).

## 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Note your **Project URL** and **Service Role Key** (Settings → API)
3. Run all migration files in the SQL Editor:
   - Upload each file from `packages/db/drizzle/` in order (0001, 0002, ...)
4. Create a storage bucket:
   - Go to Storage → New Bucket
   - Name: `attachments`
   - Public: Yes
   - Add policy: allow public SELECT on objects in `attachments` bucket

## 2. Render Setup

### API (Web Service)

1. New → Web Service → Connect your repo
2. **Build Command:** `pnpm install --frozen-lockfile && pnpm --filter @lobster-roll/shared build && pnpm --filter @lobster-roll/db build && pnpm --filter @lobster-roll/api build`
3. **Start Command:** `node packages/api/dist/index.js`
4. **Environment Variables:**

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Supabase connection string (Settings → Database → Connection string → URI) |
| `REDIS_URL` | Create a Render Redis instance, use its internal URL |
| `SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `SUPABASE_ANON_KEY` | From Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase Settings → API |
| `API_PORT` | `3000` |
| `WEB_URL` | `https://YOUR-WEB-SERVICE.onrender.com` |

### Web (Static Site)

1. New → Static Site → Connect same repo
2. **Build Command:** `pnpm install --frozen-lockfile && pnpm --filter @lobster-roll/shared build && pnpm --filter @lobster-roll/web build`
3. **Publish Directory:** `packages/web/dist`
4. **Environment Variables:**

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://YOUR-API-SERVICE.onrender.com` |

5. Add a `_redirects` file to `packages/web/public/`:
```
/* /index.html 200
```

## 3. Verify

1. Visit your web URL — you should see the login page
2. Create a workspace via the API:
```bash
curl -X POST https://YOUR-API.onrender.com/v1/workspaces \
  -H "Content-Type: application/json" \
  -d '{"name": "My Workspace"}'
```
3. Sign up through the web UI or create an account via API

## Notes

- Render free tier spins down after inactivity — first request may take 30s
- Redis is required for mention delivery workers but the API starts without it
- Auto-deploys on push to `main` branch
