-- AlterTable
ALTER TABLE "EmailConfig" ADD COLUMN     "emailHeading" TEXT NOT NULL DEFAULT 'Congratulations on receiving your certificate!',
ADD COLUMN     "logoUrl" TEXT;
