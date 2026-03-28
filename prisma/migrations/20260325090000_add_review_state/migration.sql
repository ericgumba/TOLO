-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'MASTERED', 'STRUGGLING');

-- CreateTable
CREATE TABLE "ReviewState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "status" "ReviewStatus" NOT NULL DEFAULT 'NEW',
  "intervalDays" INTEGER NOT NULL DEFAULT 1,
  "repetitionCount" INTEGER NOT NULL DEFAULT 0,
  "lastReviewedAt" TIMESTAMP(3),
  "nextReviewAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReviewState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewState_userId_questionId_key" ON "ReviewState"("userId", "questionId");
CREATE INDEX "ReviewState_userId_nextReviewAt_idx" ON "ReviewState"("userId", "nextReviewAt");
CREATE INDEX "ReviewState_userId_status_idx" ON "ReviewState"("userId", "status");

-- AddForeignKey
ALTER TABLE "ReviewState" ADD CONSTRAINT "ReviewState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewState" ADD CONSTRAINT "ReviewState_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
