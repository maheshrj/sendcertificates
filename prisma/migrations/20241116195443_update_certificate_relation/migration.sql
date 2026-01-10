/*
  Warnings:

  - Added the required column `signatures` to the `Template` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Certificate" DROP CONSTRAINT "Certificate_templateId_fkey";

-- AlterTable
ALTER TABLE "Certificate" ALTER COLUMN "templateId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Template" ADD COLUMN     "signatures" JSONB NOT NULL;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
