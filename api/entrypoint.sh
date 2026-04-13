#!/bin/sh
set -e

echo "Fixing DB permissions..."
psql $DATABASE_URL -c "ALTER DATABASE documind OWNER TO postgres;" || true

echo "Running migrations..."
npx prisma migrate deploy

node dist/index.js