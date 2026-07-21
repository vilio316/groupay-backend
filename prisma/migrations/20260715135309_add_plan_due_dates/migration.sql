-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELED');

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "dueDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "newDueDate" DATE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "Plan_status_newDueDate_idx" ON "Plan"("status", "newDueDate");
