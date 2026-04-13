CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConceptTag" (
    "conceptId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ConceptTag_pkey" PRIMARY KEY ("conceptId","tagId")
);

CREATE UNIQUE INDEX "Tag_subjectId_normalizedName_key" ON "Tag"("subjectId", "normalizedName");
CREATE INDEX "Tag_subjectId_idx" ON "Tag"("subjectId");
CREATE INDEX "ConceptTag_tagId_idx" ON "ConceptTag"("tagId");

ALTER TABLE "Tag" ADD CONSTRAINT "Tag_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConceptTag" ADD CONSTRAINT "ConceptTag_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConceptTag" ADD CONSTRAINT "ConceptTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

WITH topic_tags AS (
  SELECT DISTINCT
    topic."parentId" AS "subjectId",
    topic."title" AS "name",
    lower(trim(topic."title")) AS "normalizedName"
  FROM "Question" concept
  JOIN "Node" topic ON topic."id" = concept."nodeId"
  WHERE topic."level" = 'TOPIC'
    AND topic."parentId" IS NOT NULL
),
subtopic_parent_tags AS (
  SELECT DISTINCT
    parent_topic."parentId" AS "subjectId",
    parent_topic."title" AS "name",
    lower(trim(parent_topic."title")) AS "normalizedName"
  FROM "Question" concept
  JOIN "Node" subtopic ON subtopic."id" = concept."nodeId"
  JOIN "Node" parent_topic ON parent_topic."id" = subtopic."parentId"
  WHERE subtopic."level" = 'SUBTOPIC'
    AND parent_topic."parentId" IS NOT NULL
),
subtopic_tags AS (
  SELECT DISTINCT
    parent_topic."parentId" AS "subjectId",
    subtopic."title" AS "name",
    lower(trim(subtopic."title")) AS "normalizedName"
  FROM "Question" concept
  JOIN "Node" subtopic ON subtopic."id" = concept."nodeId"
  JOIN "Node" parent_topic ON parent_topic."id" = subtopic."parentId"
  WHERE subtopic."level" = 'SUBTOPIC'
    AND parent_topic."parentId" IS NOT NULL
)
INSERT INTO "Tag" ("id", "subjectId", "name", "normalizedName", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, tags."subjectId", tags."name", tags."normalizedName", NOW(), NOW()
FROM (
  SELECT * FROM topic_tags
  UNION
  SELECT * FROM subtopic_parent_tags
  UNION
  SELECT * FROM subtopic_tags
) AS tags
WHERE tags."normalizedName" <> ''
ON CONFLICT ("subjectId", "normalizedName") DO NOTHING;

INSERT INTO "ConceptTag" ("conceptId", "tagId")
SELECT DISTINCT concept."id", tag."id"
FROM "Question" concept
JOIN "Node" topic ON topic."id" = concept."nodeId"
JOIN "Tag" tag
  ON tag."subjectId" = topic."parentId"
 AND tag."normalizedName" = lower(trim(topic."title"))
WHERE topic."level" = 'TOPIC'
ON CONFLICT DO NOTHING;

INSERT INTO "ConceptTag" ("conceptId", "tagId")
SELECT DISTINCT concept."id", tag."id"
FROM "Question" concept
JOIN "Node" subtopic ON subtopic."id" = concept."nodeId"
JOIN "Node" parent_topic ON parent_topic."id" = subtopic."parentId"
JOIN "Tag" tag
  ON tag."subjectId" = parent_topic."parentId"
 AND tag."normalizedName" = lower(trim(parent_topic."title"))
WHERE subtopic."level" = 'SUBTOPIC'
ON CONFLICT DO NOTHING;

INSERT INTO "ConceptTag" ("conceptId", "tagId")
SELECT DISTINCT concept."id", tag."id"
FROM "Question" concept
JOIN "Node" subtopic ON subtopic."id" = concept."nodeId"
JOIN "Node" parent_topic ON parent_topic."id" = subtopic."parentId"
JOIN "Tag" tag
  ON tag."subjectId" = parent_topic."parentId"
 AND tag."normalizedName" = lower(trim(subtopic."title"))
WHERE subtopic."level" = 'SUBTOPIC'
ON CONFLICT DO NOTHING;

UPDATE "Question" concept
SET "nodeId" = topic."parentId"
FROM "Node" topic
WHERE concept."nodeId" = topic."id"
  AND topic."level" = 'TOPIC'
  AND topic."parentId" IS NOT NULL;

UPDATE "Question" concept
SET "nodeId" = parent_topic."parentId"
FROM "Node" subtopic
JOIN "Node" parent_topic ON parent_topic."id" = subtopic."parentId"
WHERE concept."nodeId" = subtopic."id"
  AND subtopic."level" = 'SUBTOPIC'
  AND parent_topic."parentId" IS NOT NULL;

DELETE FROM "Node" WHERE "level" IN ('SUBTOPIC', 'TOPIC');
