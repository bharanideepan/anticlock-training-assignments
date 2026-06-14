#!/bin/sh
set -e

echo "Running migrations..."
./node_modules/.bin/prisma migrate deploy --schema=./backend/prisma/schema.prisma

echo "Seeding database..."
node ./backend/seed-dist/prisma/seed.js

echo "Starting application..."
exec node ./backend/dist/main
