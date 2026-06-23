-- AlterTable
ALTER TABLE "Cluster" ADD COLUMN     "accountBalance" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "account" ADD COLUMN     "accountBalance" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "accountNumber" TEXT NOT NULL DEFAULT '1234567890';
