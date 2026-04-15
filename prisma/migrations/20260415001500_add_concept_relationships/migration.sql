CREATE TYPE "CompareInteractionCategory" AS ENUM (
  'COMPARE',
  'PART_WHOLE',
  'DEPENDENCY',
  'ANALOGY',
  'TRADEOFF',
  'MECHANISM_LINK'
);

CREATE TABLE "ConceptRelationship" (
  "id" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "conceptAId" TEXT NOT NULL,
  "conceptBId" TEXT NOT NULL,
  "pairKey" TEXT NOT NULL,
  "rationale" TEXT,
  "confidence" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConceptRelationship_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConceptRelationship_distinct_concepts_check" CHECK ("conceptAId" <> "conceptBId")
);

CREATE TABLE "ConceptRelationshipPrompt" (
  "id" TEXT NOT NULL,
  "relationshipId" TEXT NOT NULL,
  "category" "CompareInteractionCategory" NOT NULL,
  "prompt" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConceptRelationshipPrompt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConceptRelationshipAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "relationshipId" TEXT NOT NULL,
  "promptId" TEXT,
  "category" "CompareInteractionCategory" NOT NULL,
  "prompt" TEXT NOT NULL,
  "userAnswer" TEXT NOT NULL,
  "llmScore" INTEGER NOT NULL,
  "llmFeedback" TEXT NOT NULL,
  "llmCorrection" TEXT NOT NULL,
  "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ConceptRelationshipAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConceptRelationship_pairKey_key" ON "ConceptRelationship"("pairKey");
CREATE INDEX "ConceptRelationship_subjectId_idx" ON "ConceptRelationship"("subjectId");
CREATE INDEX "ConceptRelationship_conceptAId_idx" ON "ConceptRelationship"("conceptAId");
CREATE INDEX "ConceptRelationship_conceptBId_idx" ON "ConceptRelationship"("conceptBId");
CREATE INDEX "ConceptRelationship_subjectId_conceptAId_idx" ON "ConceptRelationship"("subjectId", "conceptAId");
CREATE INDEX "ConceptRelationship_subjectId_conceptBId_idx" ON "ConceptRelationship"("subjectId", "conceptBId");

CREATE UNIQUE INDEX "ConceptRelationshipPrompt_relationshipId_category_key" ON "ConceptRelationshipPrompt"("relationshipId", "category");
CREATE INDEX "ConceptRelationshipPrompt_relationshipId_idx" ON "ConceptRelationshipPrompt"("relationshipId");

CREATE INDEX "ConceptRelationshipAttempt_userId_answeredAt_idx" ON "ConceptRelationshipAttempt"("userId", "answeredAt");
CREATE INDEX "ConceptRelationshipAttempt_relationshipId_answeredAt_idx" ON "ConceptRelationshipAttempt"("relationshipId", "answeredAt");
CREATE INDEX "ConceptRelationshipAttempt_promptId_idx" ON "ConceptRelationshipAttempt"("promptId");

ALTER TABLE "ConceptRelationship"
  ADD CONSTRAINT "ConceptRelationship_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConceptRelationship"
  ADD CONSTRAINT "ConceptRelationship_conceptAId_fkey"
  FOREIGN KEY ("conceptAId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConceptRelationship"
  ADD CONSTRAINT "ConceptRelationship_conceptBId_fkey"
  FOREIGN KEY ("conceptBId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConceptRelationshipPrompt"
  ADD CONSTRAINT "ConceptRelationshipPrompt_relationshipId_fkey"
  FOREIGN KEY ("relationshipId") REFERENCES "ConceptRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConceptRelationshipAttempt"
  ADD CONSTRAINT "ConceptRelationshipAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConceptRelationshipAttempt"
  ADD CONSTRAINT "ConceptRelationshipAttempt_relationshipId_fkey"
  FOREIGN KEY ("relationshipId") REFERENCES "ConceptRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConceptRelationshipAttempt"
  ADD CONSTRAINT "ConceptRelationshipAttempt_promptId_fkey"
  FOREIGN KEY ("promptId") REFERENCES "ConceptRelationshipPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
