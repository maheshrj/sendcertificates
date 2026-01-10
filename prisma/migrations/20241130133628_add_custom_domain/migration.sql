-- AlterTable
ALTER TABLE "EmailConfig" ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "customEmail" TEXT,
ADD COLUMN     "dkimRecords" JSONB,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;
