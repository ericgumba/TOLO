import { QuestionType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  computeNextReviewState,
  REVIEW_STATUS,
  shouldAdvanceReviewState,
  type ReviewStatusValue,
} from "@/lib/review/scheduler";

export type DueReviewQuestion = {
  reviewStateId: string;
  questionId: string;
  questionBody: string;
  nodeId: string;
  nextReviewAt: Date;
  status: ReviewStatusValue;
};

async function getSubjectNodeIds(userId: string, subjectId?: string): Promise<string[] | null> {
  if (!subjectId) {
    return null;
  }

  const nodes = await prisma.node.findMany({
    where: { userId },
    select: { id: true, parentId: true },
  });

  const byParent = new Map<string | null, string[]>();
  for (const node of nodes) {
    const key = node.parentId ?? null;
    const existing = byParent.get(key) ?? [];
    existing.push(node.id);
    byParent.set(key, existing);
  }

  const queue = [subjectId];
  const collected = new Set<string>([subjectId]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const children = byParent.get(current) ?? [];
    for (const childId of children) {
      if (collected.has(childId)) {
        continue;
      }
      collected.add(childId);
      queue.push(childId);
    }
  }

  return Array.from(collected);
}

export async function ensureReviewStatesForMainQuestions(userId: string, subjectId?: string): Promise<void> {
  const subjectNodeIds = await getSubjectNodeIds(userId, subjectId);
  const whereClause = {
    userId,
    questionType: QuestionType.MAIN,
    ...(subjectNodeIds ? { nodeId: { in: subjectNodeIds } } : {}),
  };

  const [mainQuestions, existingStates] = await Promise.all([
    prisma.question.findMany({
      where: whereClause,
      select: { id: true },
    }),
    prisma.reviewState.findMany({
      where: { userId },
      select: { questionId: true },
    }),
  ]);

  const existingQuestionIds = new Set(existingStates.map((state) => state.questionId));
  const toCreate = mainQuestions
    .filter((question) => !existingQuestionIds.has(question.id))
    .map((question) => ({
      userId,
      questionId: question.id,
      status: REVIEW_STATUS.NEW,
      intervalDays: 1,
      repetitionCount: 0,
      nextReviewAt: new Date(),
    }));

  if (toCreate.length === 0) {
    return;
  }

  await prisma.reviewState.createMany({
    data: toCreate,
    skipDuplicates: true,
  });
}

export async function getDueReviewCount(userId: string, subjectId?: string): Promise<number> {
  await ensureReviewStatesForMainQuestions(userId, subjectId);
  const subjectNodeIds = await getSubjectNodeIds(userId, subjectId);

  return prisma.reviewState.count({
    where: {
      userId,
      nextReviewAt: { lte: new Date() },
      question: {
        questionType: QuestionType.MAIN,
        ...(subjectNodeIds ? { nodeId: { in: subjectNodeIds } } : {}),
      },
    },
  });
}

export async function getDueReviewQuestions(
  userId: string,
  limit = 20,
  subjectId?: string,
): Promise<DueReviewQuestion[]> {
  await ensureReviewStatesForMainQuestions(userId, subjectId);
  const subjectNodeIds = await getSubjectNodeIds(userId, subjectId);

  const rows = await prisma.reviewState.findMany({
    where: {
      userId,
      nextReviewAt: { lte: new Date() },
      question: {
        questionType: QuestionType.MAIN,
        ...(subjectNodeIds ? { nodeId: { in: subjectNodeIds } } : {}),
      },
    },
    orderBy: [{ nextReviewAt: "asc" }, { updatedAt: "asc" }],
    take: limit,
    select: {
      id: true,
      nextReviewAt: true,
      status: true,
      question: {
        select: {
          id: true,
          body: true,
          nodeId: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    reviewStateId: row.id,
    questionId: row.question.id,
    questionBody: row.question.body,
    nodeId: row.question.nodeId,
    nextReviewAt: row.nextReviewAt,
    status: row.status,
  }));
}

export async function upsertReviewStateFromAttempt(input: {
  userId: string;
  questionId: string;
  llmScore: number;
  reviewedAt: Date;
}): Promise<void> {
  const question = await prisma.question.findFirst({
    where: {
      id: input.questionId,
      userId: input.userId,
    },
    select: {
      id: true,
      questionType: true,
    },
  });

  if (!question || question.questionType !== QuestionType.MAIN) {
    return;
  }

  const existingState = await prisma.reviewState.findUnique({
    where: {
      userId_questionId: {
        userId: input.userId,
        questionId: input.questionId,
      },
    },
    select: {
      intervalDays: true,
      repetitionCount: true,
      nextReviewAt: true,
    },
  });

  if (
    existingState &&
    !shouldAdvanceReviewState({
      reviewedAt: input.reviewedAt,
      nextReviewAt: existingState.nextReviewAt,
    })
  ) {
    return;
  }

  const next = computeNextReviewState({
    llmScore: input.llmScore,
    reviewedAt: input.reviewedAt,
    currentIntervalDays: existingState?.intervalDays,
    currentRepetitionCount: existingState?.repetitionCount,
  });

  await prisma.reviewState.upsert({
    where: {
      userId_questionId: {
        userId: input.userId,
        questionId: input.questionId,
      },
    },
    create: {
      userId: input.userId,
      questionId: input.questionId,
      status: next.status,
      intervalDays: next.intervalDays,
      repetitionCount: next.repetitionCount,
      lastReviewedAt: next.lastReviewedAt,
      nextReviewAt: next.nextReviewAt,
    },
    update: {
      status: next.status,
      intervalDays: next.intervalDays,
      repetitionCount: next.repetitionCount,
      lastReviewedAt: next.lastReviewedAt,
      nextReviewAt: next.nextReviewAt,
    },
  });
}
