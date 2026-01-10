/*
  Warnings:

  - You are about to drop the `DomainConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmailTemplate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DomainConfig" DROP CONSTRAINT "DomainConfig_userId_fkey";

-- DropForeignKey
ALTER TABLE "EmailTemplate" DROP CONSTRAINT "EmailTemplate_userId_fkey";

-- DropTable
DROP TABLE "DomainConfig";

-- DropTable
DROP TABLE "EmailTemplate";

-- CreateTable
CREATE TABLE "EmailConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultSubject" TEXT NOT NULL DEFAULT 'Your Certificate',
    "defaultMessage" TEXT NOT NULL DEFAULT 'Please find your certificate attached.',
    "logoUrl" TEXT,
    "emailHeading" TEXT NOT NULL DEFAULT 'Congratulations on receiving your certificate!',
    "supportEmail" TEXT DEFAULT 'support@example.com',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customDomain" TEXT,
    "customEmail" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "dkimRecords" JSONB,

    CONSTRAINT "EmailConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailConfig_userId_key" ON "EmailConfig"("userId");

-- AddForeignKey
ALTER TABLE "EmailConfig" ADD CONSTRAINT "EmailConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
