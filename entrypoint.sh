#!/bin/sh
set -e

echo "🔄 Running Prisma migrations..."
cd /app/server
npx prisma db push --accept-data-loss

echo "🚀 Starting server..."
node dist/index.js &

echo "🌐 Starting client..."
serve -s /app/client/dist -l 5173 &

wait
