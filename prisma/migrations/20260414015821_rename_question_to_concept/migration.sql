-- Rename the table instead of dropping/recreating it
ALTER TABLE "public"."Question" RENAME TO "Concept";

-- Rename foreign key constraint names on the renamed table for clarity
ALTER TABLE "public"."Concept" RENAME CONSTRAINT "Question_userId_fkey" TO "Concept_userId_fkey";
ALTER TABLE "public"."Concept" RENAME CONSTRAINT "Question_nodeId_fkey" TO "Concept_nodeId_fkey";

-- Rename indexes for clarity
ALTER INDEX "public"."Question_userId_nodeId_idx" RENAME TO "Concept_userId_nodeId_idx";
ALTER INDEX "public"."Question_nodeId_idx" RENAME TO "Concept_nodeId_idx";

-- Drop and recreate foreign keys in related tables so they reference the renamed table
ALTER TABLE "public"."ConceptTag" DROP CONSTRAINT "ConceptTag_conceptId_fkey";
ALTER TABLE "public"."GeneratedQuestion" DROP CONSTRAINT "GeneratedQuestion_questionId_fkey";
ALTER TABLE "public"."ReviewState" DROP CONSTRAINT "ReviewState_questionId_fkey";

ALTER TABLE "public"."ConceptTag"
  ADD CONSTRAINT "ConceptTag_conceptId_fkey"
  FOREIGN KEY ("conceptId") REFERENCES "public"."Concept"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."GeneratedQuestion"
  ADD CONSTRAINT "GeneratedQuestion_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "public"."Concept"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ReviewState"
  ADD CONSTRAINT "ReviewState_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "public"."Concept"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;