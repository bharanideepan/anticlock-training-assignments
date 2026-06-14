#!/bin/sh

echo "==> Running migrations..."
./node_modules/.bin/prisma migrate deploy --schema=./backend/prisma/schema.prisma
MIGRATE_CODE=$?
if [ $MIGRATE_CODE -ne 0 ]; then
  echo "==> Migration failed with exit code $MIGRATE_CODE, aborting."
  exit $MIGRATE_CODE
fi
echo "==> Migrations done."

echo "==> Running seed..."
node ./backend/seed-dist/prisma/seed.js
SEED_CODE=$?
if [ $SEED_CODE -ne 0 ]; then
  echo "==> Seed failed with exit code $SEED_CODE, continuing anyway."
fi
echo "==> Seed done."

echo "==> Starting application..."
exec node ./backend/dist/main
