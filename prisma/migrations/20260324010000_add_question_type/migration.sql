-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MAIN', 'FOLLOW_UP');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "questionType" "QuestionType" NOT NULL DEFAULT 'MAIN';

-- CreateIndex
CREATE INDEX "Question_userId_questionType_idx" ON "Question"("userId", "questionType");
