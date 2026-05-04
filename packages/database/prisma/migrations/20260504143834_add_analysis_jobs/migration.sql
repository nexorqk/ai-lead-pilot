-- CreateEnum
CREATE TYPE "LeadAiAnalysisJobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "LeadAiAnalysisJob" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" "LeadAiAnalysisJobStatus" NOT NULL DEFAULT 'pending',
    "bullmqJobId" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadAiAnalysisJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadAiAnalysisJob_leadId_createdAt_idx" ON "LeadAiAnalysisJob"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadAiAnalysisJob_status_idx" ON "LeadAiAnalysisJob"("status");

-- AddForeignKey
ALTER TABLE "LeadAiAnalysisJob" ADD CONSTRAINT "LeadAiAnalysisJob_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
