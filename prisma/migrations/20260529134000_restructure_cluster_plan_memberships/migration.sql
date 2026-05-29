-- CreateTable
CREATE TABLE "ClusterMember" (
    "id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,

    CONSTRAINT "ClusterMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanMember" (
    "id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,

    CONSTRAINT "PlanMember_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "clusterId" TEXT;

-- Backfill scoped memberships from the previous shared Member table.
INSERT INTO "ClusterMember" ("id", "joinedAt", "userId", "clusterId")
SELECT "memberId" || ':' || "clusterId", "joinDate", "memberId", "clusterId"
FROM "Member"
WHERE "clusterId" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "PlanMember" ("id", "joinedAt", "userId", "planId")
SELECT "memberId" || ':' || "planId", "joinDate", "memberId", "planId"
FROM "Member"
WHERE "planId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Infer the containing cluster for existing plans where older data provides it.
UPDATE "Plan" AS plan
SET "clusterId" = member."clusterId"
FROM "Member" AS member
WHERE member."planId" = plan."id"
  AND member."clusterId" IS NOT NULL
  AND plan."clusterId" IS NULL;

UPDATE "Plan" AS plan
SET "clusterId" = transaction."clusterId"
FROM "Transaction" AS transaction
WHERE transaction."planId" = plan."id"
  AND transaction."clusterId" IS NOT NULL
  AND plan."clusterId" IS NULL;

-- Enforce the new invariant: plans must be found within clusters.
ALTER TABLE "Plan" ALTER COLUMN "clusterId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_clusterId_fkey";
ALTER TABLE "Member" DROP CONSTRAINT "Member_memberId_fkey";
ALTER TABLE "Member" DROP CONSTRAINT "Member_planId_fkey";
ALTER TABLE "Cluster" DROP CONSTRAINT "Cluster_userId_fkey";
ALTER TABLE "Plan" DROP CONSTRAINT "Plan_userId_fkey";

-- DropIndex
DROP INDEX "Member_memberId_key";

-- AlterTable
ALTER TABLE "Cluster" DROP COLUMN "userId";
ALTER TABLE "Plan" DROP COLUMN "userId";

-- DropTable
DROP TABLE "Member";

-- CreateIndex
CREATE INDEX "ClusterMember_clusterId_idx" ON "ClusterMember"("clusterId");
CREATE INDEX "ClusterMember_userId_idx" ON "ClusterMember"("userId");
CREATE UNIQUE INDEX "ClusterMember_userId_clusterId_key" ON "ClusterMember"("userId", "clusterId");
CREATE INDEX "PlanMember_planId_idx" ON "PlanMember"("planId");
CREATE INDEX "PlanMember_userId_idx" ON "PlanMember"("userId");
CREATE UNIQUE INDEX "PlanMember_userId_planId_key" ON "PlanMember"("userId", "planId");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClusterMember" ADD CONSTRAINT "ClusterMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClusterMember" ADD CONSTRAINT "ClusterMember_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanMember" ADD CONSTRAINT "PlanMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanMember" ADD CONSTRAINT "PlanMember_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
