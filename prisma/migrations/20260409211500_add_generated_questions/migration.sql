CREATE TYPE "GeneratedQuestionCategory" AS ENUM ('EXPLAIN', 'ANALYZE', 'EVALUATE', 'APPLY', 'TEACH');

CREATE TABLE "GeneratedQuestion" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "category" "GeneratedQuestionCategory" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedQuestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GeneratedQuestion_questionId_category_key" ON "GeneratedQuestion"("questionId", "category");
CREATE INDEX "GeneratedQuestion_questionId_idx" ON "GeneratedQuestion"("questionId");

ALTER TABLE "GeneratedQuestion"
ADD CONSTRAINT "GeneratedQuestion_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "Question"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
