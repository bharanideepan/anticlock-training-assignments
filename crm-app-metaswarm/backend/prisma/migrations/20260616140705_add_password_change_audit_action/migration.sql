-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_CHANGE';

-- DropIndex
DROP INDEX "contacts_search_vector_idx";

-- DropIndex
DROP INDEX "customers_search_vector_idx";

-- DropIndex
DROP INDEX "opportunities_search_vector_idx";
