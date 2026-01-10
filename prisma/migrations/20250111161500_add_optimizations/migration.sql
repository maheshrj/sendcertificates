-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "FailedCertificate" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "error" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FailedCertificate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FailedCertificate" ADD CONSTRAINT "FailedCertificate_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
