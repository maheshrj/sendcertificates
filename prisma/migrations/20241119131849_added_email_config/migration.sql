-- CreateTable
CREATE TABLE "EmailConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultSubject" TEXT NOT NULL DEFAULT 'Your Certificate',
    "defaultMessage" TEXT NOT NULL DEFAULT 'Please find your certificate attached.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailConfig_userId_key" ON "EmailConfig"("userId");

-- AddForeignKey
ALTER TABLE "EmailConfig" ADD CONSTRAINT "EmailConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
