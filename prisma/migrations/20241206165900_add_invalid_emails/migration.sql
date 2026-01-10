-- CreateTable
CREATE TABLE "InvalidEmail" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvalidEmail_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InvalidEmail" ADD CONSTRAINT "InvalidEmail_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
