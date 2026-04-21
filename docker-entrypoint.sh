#!/bin/sh
set -e

echo "Running database migrations..."
node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prod.prisma

echo "Starting application..."
exec "$@"
