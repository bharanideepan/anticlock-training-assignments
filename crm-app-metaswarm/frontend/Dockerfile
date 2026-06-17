# Stage 1: builder
FROM node:20-slim AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace root files needed for pnpm workspace resolution
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc* ./

# Copy frontend package.json so pnpm can resolve the workspace package
COPY frontend/package.json ./frontend/

# Install dependencies (only frontend workspace)
RUN pnpm install --filter @crm/frontend --frozen-lockfile

# Copy frontend source files
COPY frontend/ ./frontend/

# Build the frontend
RUN pnpm --filter @crm/frontend build

# Stage 2: production
FROM nginx:alpine AS production

# Copy built assets from builder stage
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
