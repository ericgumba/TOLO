-- AlterTable
ALTER TABLE "Question" ADD COLUMN "parentQuestionId" TEXT;

-- CreateIndex
CREATE INDEX "Question_userId_parentQuestionId_idx" ON "Question"("userId", "parentQuestionId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_parentQuestionId_fkey" FOREIGN KEY ("parentQuestionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
