-- Add new fields to Bounce table
ALTER TABLE "Bounce" ADD COLUMN IF NOT EXISTS "bounceType" TEXT;
ALTER TABLE "Bounce" ADD COLUMN IF NOT EXISTS "diagnosticCode" TEXT;

-- Create indexes on Bounce (if they don't exist)
CREATE INDEX IF NOT EXISTS "Bounce_email_idx" ON "Bounce"("email");
CREATE INDEX IF NOT EXISTS "Bounce_userId_idx" ON "Bounce"("userId");
CREATE INDEX IF NOT EXISTS "Bounce_batchId_idx" ON "Bounce"("batchId");

-- Create Complaint table
CREATE TABLE IF NOT EXISTS "Complaint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "batchId" TEXT,
    "complaintType" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes on Complaint
CREATE INDEX IF NOT EXISTS "Complaint_email_idx" ON "Complaint"("email");
CREATE INDEX IF NOT EXISTS "Complaint_userId_idx" ON "Complaint"("userId");
CREATE INDEX IF NOT EXISTS "Complaint_batchId_idx" ON "Complaint"("batchId");

-- Create SuppressionList table
CREATE TABLE IF NOT EXISTS "SuppressionList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "reason" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes on SuppressionList
CREATE INDEX IF NOT EXISTS "SuppressionList_email_idx" ON "SuppressionList"("email");
CREATE INDEX IF NOT EXISTS "SuppressionList_reason_idx" ON "SuppressionList"("reason");