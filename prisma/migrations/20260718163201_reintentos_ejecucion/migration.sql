-- AlterTable
ALTER TABLE "AgentAction" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "nextRetryAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AgentAction_status_nextRetryAt_idx" ON "AgentAction"("status", "nextRetryAt");
