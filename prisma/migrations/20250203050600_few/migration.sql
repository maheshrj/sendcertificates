/*
  Warnings:

  - You are about to drop the `EmailConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EmailConfig" DROP CONSTRAINT "EmailConfig_userId_fkey";

-- DropTable
DROP TABLE "EmailConfig";

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultSubject" TEXT NOT NULL DEFAULT 'Your Certificate',
    "defaultMessage" TEXT NOT NULL DEFAULT 'Please find your certificate attached.',
    "logoUrl" TEXT,
    "emailHeading" TEXT NOT NULL DEFAULT 'Congratulations on receiving your certificate!',
    "supportEmail" TEXT DEFAULT 'support@example.com',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customDomain" TEXT,
    "customEmail" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "dkimRecords" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DomainConfig_userId_key" ON "DomainConfig"("userId");

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainConfig" ADD CONSTRAINT "DomainConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
