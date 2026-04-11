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

async function getScopeNodeIds(userId: string, subjectId?: string): Promise<string[] | null> {
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

export async function ensureReviewStatesForQuestions(userId: string, subjectId?: string): Promise<void> {
  const subjectNodeIds = await getScopeNodeIds(userId, subjectId);
  const whereClause = {
    userId,
    ...(subjectNodeIds ? { nodeId: { in: subjectNodeIds } } : {}),
  };

  const [questions, existingStates] = await Promise.all([
    prisma.concept.findMany({
      where: whereClause,
      select: { id: true },
    }),
    prisma.reviewState.findMany({
      where: { userId },
      select: { conceptId: true },
    }),
  ]);

  const existingQuestionIds = new Set(existingStates.map((state) => state.conceptId));
  const toCreate = questions
    .filter((question) => !existingQuestionIds.has(question.id))
    .map((question) => ({
      userId,
      conceptId: question.id,
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
  await ensureReviewStatesForQuestions(userId, subjectId);
  const subjectNodeIds = await getScopeNodeIds(userId, subjectId);

  return prisma.reviewState.count({
    where: {
      userId,
      nextReviewAt: { lte: new Date() },
      concept: {
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
  await ensureReviewStatesForQuestions(userId, subjectId);
  const subjectNodeIds = await getScopeNodeIds(userId, subjectId);

  const rows = await prisma.reviewState.findMany({
    where: {
      userId,
      nextReviewAt: { lte: new Date() },
      concept: {
        ...(subjectNodeIds ? { nodeId: { in: subjectNodeIds } } : {}),
      },
    },
    orderBy: [{ nextReviewAt: "asc" }, { updatedAt: "asc" }],
    take: limit,
    select: {
      id: true,
      nextReviewAt: true,
      status: true,
      concept: {
        select: {
          id: true,
          title: true,
          nodeId: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    reviewStateId: row.id,
    questionId: row.concept.id,
    questionBody: row.concept.title,
    nodeId: row.concept.nodeId,
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
  const question = await prisma.concept.findFirst({
    where: {
      id: input.questionId,
      userId: input.userId,
    },
    select: {
      id: true,
    },
  });

  if (!question) {
    return;
  }

  const existingState = await prisma.reviewState.findUnique({
    where: {
      userId_conceptId: {
        userId: input.userId,
        conceptId: input.questionId,
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
    await prisma.reviewState.update({
      where: {
        userId_conceptId: {
          userId: input.userId,
          conceptId: input.questionId,
        },
      },
      data: {
        lastAnsweredAt: input.reviewedAt,
      },
    });
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
      userId_conceptId: {
        userId: input.userId,
        conceptId: input.questionId,
      },
    },
    create: {
      userId: input.userId,
      conceptId: input.questionId,
      status: next.status,
      intervalDays: next.intervalDays,
      repetitionCount: next.repetitionCount,
      lastAnsweredAt: input.reviewedAt,
      lastReviewedAt: next.lastReviewedAt,
      nextReviewAt: next.nextReviewAt,
    },
    update: {
      status: next.status,
      intervalDays: next.intervalDays,
      repetitionCount: next.repetitionCount,
      lastAnsweredAt: input.reviewedAt,
      lastReviewedAt: next.lastReviewedAt,
      nextReviewAt: next.nextReviewAt,
    },
  });
}
