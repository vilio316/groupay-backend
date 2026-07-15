-- CreateTable
CREATE TABLE "pending_transaction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "planId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "pending_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pending_transaction_clusterId_status_idx" ON "pending_transaction"("clusterId", "status");

-- CreateIndex
CREATE INDEX "pending_transaction_expiresAt_idx" ON "pending_transaction"("expiresAt");
