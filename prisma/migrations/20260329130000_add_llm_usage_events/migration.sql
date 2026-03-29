-- CreateEnum
CREATE TYPE "LlmUsageType" AS ENUM ('GRADE', 'HINT');

-- CreateTable
CREATE TABLE "LlmUsageEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "LlmUsageType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LlmUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LlmUsageEvent_userId_createdAt_idx" ON "LlmUsageEvent"("userId", "createdAt");
CREATE INDEX "LlmUsageEvent_userId_type_createdAt_idx" ON "LlmUsageEvent"("userId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "LlmUsageEvent" ADD CONSTRAINT "LlmUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
