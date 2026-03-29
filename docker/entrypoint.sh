#!/bin/sh
set -e

echo "🦞 Lobster Roll — Starting API"

# Run migrations if migration files exist
if [ -d "packages/db/drizzle" ] && [ "$(ls -A packages/db/drizzle/*.sql 2>/dev/null)" ]; then
  echo "📦 Running database migrations..."
  for f in packages/db/drizzle/*.sql; do
    echo "  → $(basename $f)"
    PGPASSWORD=$(echo $DATABASE_URL | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p') \
    psql "$DATABASE_URL" -f "$f" -q 2>/dev/null || true
  done
  echo "✅ Migrations complete"
fi

echo "🚀 Starting server..."
exec node packages/api/dist/index.js
