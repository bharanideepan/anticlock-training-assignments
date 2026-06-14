# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /workspace

RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace manifests first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY e2e/package.json ./e2e/

RUN pnpm install --frozen-lockfile

COPY backend/ ./backend/
RUN pnpm --filter backend exec prisma generate
RUN pnpm --filter backend run build

# Compile seed script to JS so it can run without ts-node in production
RUN cd backend && pnpm exec tsc \
  --module CommonJS --target ES2023 --esModuleInterop \
  --skipLibCheck --strict --moduleResolution node \
  --outDir seed-dist --rootDir . \
  prisma/seed.ts

# --- Production stage ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace manifests for prod install
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY e2e/package.json ./e2e/

RUN pnpm install --frozen-lockfile --prod

# Copy prisma schema and regenerate client for this platform
COPY --from=builder /workspace/backend/prisma ./backend/prisma
RUN pnpm --filter backend exec prisma generate

COPY --from=builder /workspace/backend/dist ./backend/dist
COPY --from=builder /workspace/backend/seed-dist ./backend/seed-dist

COPY backend/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["./entrypoint.sh"]
