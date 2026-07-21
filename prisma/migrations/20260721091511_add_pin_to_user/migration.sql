-- AlterTable
ALTER TABLE "user" ADD COLUMN     "pin" TEXT,
ADD COLUMN     "pinSet" BOOLEAN NOT NULL DEFAULT false;
