ALTER TABLE "Question" DROP CONSTRAINT IF EXISTS "Question_parentQuestionId_fkey";

DROP INDEX IF EXISTS "Question_userId_parentQuestionId_idx";
DROP INDEX IF EXISTS "Question_userId_questionType_idx";

ALTER TABLE "Question" DROP COLUMN IF EXISTS "parentQuestionId";
ALTER TABLE "Question" DROP COLUMN IF EXISTS "questionType";

DROP TYPE IF EXISTS "QuestionType";
