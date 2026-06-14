-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "RoleName" AS ENUM ('SYSTEM_ADMINISTRATOR', 'SALES_MANAGER', 'SALES_REPRESENTATIVE', 'SUPPORT_REPRESENTATIVE', 'READ_ONLY');
CREATE TYPE "CustomerStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "RevenueRange" AS ENUM ('UNDER_1M', '1M_10M', '10M_50M', '50M_250M', 'OVER_250M');
CREATE TYPE "ActivityType" AS ENUM ('PHONE_CALL', 'MEETING', 'EMAIL', 'NOTE', 'FOLLOW_UP');
CREATE TYPE "TerminalOutcome" AS ENUM ('WON', 'LOST');
CREATE TYPE "TaskType" AS ENUM ('FOLLOW_UP', 'CALL', 'MEETING', 'EMAIL', 'INTERNAL_ACTION');
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');
CREATE TYPE "NotificationType" AS ENUM ('TASK_ASSIGNED', 'OPPORTUNITY_ASSIGNED', 'DUE_DATE_REMINDER', 'OVERDUE_TASK', 'CUSTOMER_UPDATED');
CREATE TYPE "ResourceType" AS ENUM ('CUSTOMER', 'OPPORTUNITY', 'ACTIVITY');
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_RESET', 'RECORD_CREATED', 'RECORD_UPDATED', 'RECORD_DELETED', 'STATUS_CHANGED', 'OWNERSHIP_CHANGED', 'ROLE_CHANGED', 'IMPORT_COMPLETED');
CREATE TYPE "SsoProvider" AS ENUM ('SAML', 'OIDC');
CREATE TYPE "ImportType" AS ENUM ('CUSTOMER', 'CONTACT');
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'VALIDATING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable: roles
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" "RoleName" NOT NULL,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateTable: users
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "jobTitle" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "roleId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_roleId_idx" ON "users"("roleId");
CREATE INDEX "users_status_idx" ON "users"("status");
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateTable: teams
CREATE TABLE "teams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "managerId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,
    CONSTRAINT "teams_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "teams_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");
CREATE INDEX "teams_managerId_idx" ON "teams"("managerId");
CREATE INDEX "teams_deletedAt_idx" ON "teams"("deletedAt");

-- CreateTable: team_members
CREATE TABLE "team_members" (
    "userId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_members_pkey" PRIMARY KEY ("userId", "teamId"),
    CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: customers
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyName" TEXT NOT NULL,
    "industry" TEXT,
    "website" TEXT,
    "revenueRange" "RevenueRange",
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'PROSPECT',
    "ownerId" UUID NOT NULL,
    "searchVector" tsvector,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customers_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "customers_ownerId_idx" ON "customers"("ownerId");
CREATE INDEX "customers_status_idx" ON "customers"("status");
CREATE INDEX "customers_deletedAt_idx" ON "customers"("deletedAt");
CREATE INDEX "customers_status_ownerId_deletedAt_idx" ON "customers"("status", "ownerId", "deletedAt");

-- CreateTable: contacts
CREATE TABLE "contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "designation" TEXT,
    "department" TEXT,
    "notes" TEXT,
    "customerId" UUID NOT NULL,
    "searchVector" tsvector,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,
    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contacts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "contacts_customerId_idx" ON "contacts"("customerId");
CREATE INDEX "contacts_email_idx" ON "contacts"("email");
CREATE INDEX "contacts_deletedAt_idx" ON "contacts"("deletedAt");
CREATE INDEX "contacts_customerId_deletedAt_idx" ON "contacts"("customerId", "deletedAt");

-- CreateTable: activities
CREATE TABLE "activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "ActivityType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMPTZ,
    "durationMinutes" INTEGER,
    "customerId" UUID NOT NULL,
    "contactId" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,
    CONSTRAINT "activities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activities_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "activities_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "activities_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "activities_customerId_idx" ON "activities"("customerId");
CREATE INDEX "activities_contactId_idx" ON "activities"("contactId");
CREATE INDEX "activities_createdById_idx" ON "activities"("createdById");
CREATE INDEX "activities_createdAt_idx" ON "activities"("createdAt" DESC);
CREATE INDEX "activities_deletedAt_idx" ON "activities"("deletedAt");
CREATE INDEX "activities_customerId_createdAt_idx" ON "activities"("customerId", "createdAt" DESC);

-- CreateTable: pipeline_stages
CREATE TABLE "pipeline_stages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "terminalOutcome" "TerminalOutcome",
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,
    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pipeline_stages_displayOrder_idx" ON "pipeline_stages"("displayOrder");
CREATE INDEX "pipeline_stages_deletedAt_idx" ON "pipeline_stages"("deletedAt");

-- CreateTable: opportunities
CREATE TABLE "opportunities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "contactId" UUID,
    "ownerId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "expectedRevenue" DECIMAL(15,2),
    "probability" INTEGER,
    "expectedCloseDate" TIMESTAMPTZ,
    "actualCloseDate" TIMESTAMPTZ,
    "closeNote" TEXT,
    "searchVector" tsvector,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,
    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "opportunities_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "opportunities_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "opportunities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "opportunities_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "opportunities_customerId_idx" ON "opportunities"("customerId");
CREATE INDEX "opportunities_ownerId_idx" ON "opportunities"("ownerId");
CREATE INDEX "opportunities_stageId_idx" ON "opportunities"("stageId");
CREATE INDEX "opportunities_expectedCloseDate_idx" ON "opportunities"("expectedCloseDate");
CREATE INDEX "opportunities_deletedAt_idx" ON "opportunities"("deletedAt");
CREATE INDEX "opportunities_stageId_ownerId_deletedAt_idx" ON "opportunities"("stageId", "ownerId", "deletedAt");

-- CreateTable: tasks
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "TaskType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMPTZ NOT NULL,
    "completedAt" TIMESTAMPTZ,
    "cancelledAt" TIMESTAMPTZ,
    "assigneeId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "customerId" UUID,
    "opportunityId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "tasks_assigneeId_idx" ON "tasks"("assigneeId");
CREATE INDEX "tasks_createdById_idx" ON "tasks"("createdById");
CREATE INDEX "tasks_customerId_idx" ON "tasks"("customerId");
CREATE INDEX "tasks_opportunityId_idx" ON "tasks"("opportunityId");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_dueDate_idx" ON "tasks"("dueDate");
CREATE INDEX "tasks_deletedAt_idx" ON "tasks"("deletedAt");
CREATE INDEX "tasks_assigneeId_status_dueDate_idx" ON "tasks"("assigneeId", "status", "dueDate");

-- CreateTable: notifications
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" UUID,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt" DESC);
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt" DESC);

-- CreateTable: files
CREATE TABLE "files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "resourceId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    CONSTRAINT "files_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "files_resourceType_resourceId_idx" ON "files"("resourceType", "resourceId");
CREATE INDEX "files_uploadedById_idx" ON "files"("uploadedById");
CREATE INDEX "files_deletedAt_idx" ON "files"("deletedAt");

-- CreateTable: audit_logs
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorId" UUID,
    "action" "AuditAction" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" UUID,
    "previousValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "traceId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);

-- CreateTable: refresh_tokens
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "revokedAt" TIMESTAMPTZ,
    "replacedByTokenId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "refresh_tokens_tokenHash_idx" ON "refresh_tokens"("tokenHash");
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateTable: password_reset_tokens
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "usedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "password_reset_tokens_tokenHash_idx" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateTable: sso_configs
CREATE TABLE "sso_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" "SsoProvider" NOT NULL,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "sso_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: import_jobs
CREATE TABLE "import_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "ImportType" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" UUID NOT NULL,
    "inputS3Key" TEXT NOT NULL,
    "resultS3Key" TEXT,
    "errorDetails" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "import_jobs_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "import_jobs_uploadedById_idx" ON "import_jobs"("uploadedById");
CREATE INDEX "import_jobs_status_idx" ON "import_jobs"("status");
