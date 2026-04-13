"use server";

import { NodeLevel } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  conceptCreateSchema,
  generatedNodeConceptAddSchema,
  questionDeleteSchema,
  questionSettingsSchema,
} from "@/lib/auth/validation";
import { prisma } from "@/lib/prisma";
import { normalizeQuestionText } from "@/lib/quiz/generated-questions";

type AddGeneratedConceptResult =
  | {
      status: "success";
      conceptId: string;
    }
  | {
      status: "duplicate";
    }
  | {
      status: "error";
      error: string;
    };

type RemoveGeneratedConceptResult =
  | {
      status: "success";
    }
  | {
      status: "not_found";
    }
  | {
      status: "error";
      error: string;
    };

async function requireAuthUserId(): Promise<string> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user.id;
}

function normalizeReturnTo(returnTo?: string): string {
  return returnTo?.startsWith("/") ? returnTo : "/dashboard";
}

function normalizeTagName(tag: string): string {
  return tag.trim().replace(/\s+/g, " ");
}

function parseTagInput(input?: string): Array<{ name: string; normalizedName: string }> {
  if (!input) {
    return [];
  }

  const seen = new Set<string>();

  return input
    .split(",")
    .map(normalizeTagName)
    .filter((tag) => tag.length > 0)
    .map((tag) => ({
      name: tag,
      normalizedName: tag.toLowerCase(),
    }))
    .filter((tag) => {
      if (seen.has(tag.normalizedName)) {
        return false;
      }

      seen.add(tag.normalizedName);
      return true;
    })
    .slice(0, 10);
}

async function createConceptForUser(userId: string, subjectId: string, title: string, tags: string[] = []) {
  const normalizedTags = parseTagInput(tags.join(","));

  return prisma.concept.create({
    data: {
      userId,
      nodeId: subjectId,
      title,
      conceptTags:
        normalizedTags.length > 0
          ? {
              create: normalizedTags.map((tag) => ({
                tag: {
                  connectOrCreate: {
                    where: {
                      subjectId_normalizedName: {
                        subjectId,
                        normalizedName: tag.normalizedName,
                      },
                    },
                    create: {
                      subjectId,
                      name: tag.name,
                      normalizedName: tag.normalizedName,
                    },
                  },
                },
              })),
            }
          : undefined,
      reviewStates: {
        create: {
          userId,
          status: "NEW",
          intervalDays: 1,
          repetitionCount: 0,
          nextReviewAt: new Date(),
        },
      },
    },
    select: {
      id: true,
    },
  });
}

export async function createConceptAction(formData: FormData) {
  const userId = await requireAuthUserId();

  const parsed = conceptCreateSchema.safeParse({
    nodeId: formData.get("nodeId"),
    title: formData.get("title"),
    tags: formData.get("tags") || undefined,
    returnTo: formData.get("returnTo") || undefined,
  });

  if (!parsed.success) {
    redirect("/dashboard?error=Invalid%20concept%20input");
  }

  const node = await prisma.node.findFirst({
    where: {
      id: parsed.data.nodeId,
      userId,
    },
    select: {
      id: true,
      level: true,
    },
  });

  if (!node || node.level !== NodeLevel.SUBJECT) {
    redirect("/dashboard?error=Node%20not%20found");
  }

  await createConceptForUser(
    userId,
    parsed.data.nodeId,
    parsed.data.title,
    parseTagInput(parsed.data.tags).map((tag) => tag.name),
  );

  revalidatePath("/dashboard");
  if (parsed.data.returnTo) {
    revalidatePath(parsed.data.returnTo);
    redirect(parsed.data.returnTo);
  }

  redirect("/dashboard");
}

export async function addGeneratedConceptToNodeAction(input: {
  nodeId: string;
  title: string;
  tags?: string[];
  returnTo?: string;
}): Promise<AddGeneratedConceptResult> {
  return addConceptToNodeAction(input);
}

export async function addRelatedConceptToNodeAction(input: {
  nodeId: string;
  title: string;
  tags?: string[];
  returnTo?: string;
}): Promise<AddGeneratedConceptResult> {
  return addConceptToNodeAction(input);
}

async function addConceptToNodeAction(input: {
  nodeId: string;
  title: string;
  tags?: string[];
  returnTo?: string;
}): Promise<AddGeneratedConceptResult> {
  const userId = await requireAuthUserId();

  const parsed = generatedNodeConceptAddSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      error: "Invalid concept input.",
    };
  }

  const returnTo = normalizeReturnTo(parsed.data.returnTo);
  const node = await prisma.node.findFirst({
    where: {
      id: parsed.data.nodeId,
      userId,
    },
    select: {
      id: true,
      level: true,
    },
  });

  if (!node || node.level !== NodeLevel.SUBJECT) {
    return {
      status: "error",
      error: "Selected subject not found.",
    };
  }

  const normalizedCandidate = normalizeQuestionText(parsed.data.title);
  const existingConcepts = await prisma.concept.findMany({
    where: {
      userId,
      nodeId: parsed.data.nodeId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      title: true,
    },
  });

  const hasDuplicate = existingConcepts.some(
    (concept) => normalizeQuestionText(concept.title) === normalizedCandidate,
  );

  if (hasDuplicate) {
    return {
      status: "duplicate",
    };
  }

  try {
    const createdConcept = await createConceptForUser(
      userId,
      parsed.data.nodeId,
      parsed.data.title,
      parsed.data.tags ?? [],
    );

    revalidatePath("/dashboard");
    revalidatePath(returnTo);

    return {
      status: "success",
      conceptId: createdConcept.id,
    };
  } catch {
    return {
      status: "error",
      error: "Could not add this concept right now.",
    };
  }
}

export async function removeGeneratedConceptFromNodeAction(input: {
  conceptId: string;
  returnTo?: string;
}): Promise<RemoveGeneratedConceptResult> {
  const userId = await requireAuthUserId();

  const parsed = questionSettingsSchema.safeParse({
    questionId: input.conceptId,
    returnTo: input.returnTo,
  });

  if (!parsed.success) {
    return {
      status: "error",
      error: "Invalid concept removal input.",
    };
  }

  const returnTo = normalizeReturnTo(parsed.data.returnTo);
  let deleted: { count: number };

  try {
    deleted = await prisma.concept.deleteMany({
      where: {
        id: parsed.data.questionId,
        userId,
      },
    });
  } catch {
    return {
      status: "error",
      error: "Could not remove this concept right now.",
    };
  }

  if (deleted.count === 0) {
    return {
      status: "not_found",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath(returnTo);

  return {
    status: "success",
  };
}

export async function resetConceptReviewStateAction(formData: FormData) {
  const userId = await requireAuthUserId();

  const parsed = questionSettingsSchema.safeParse({
    questionId: formData.get("questionId"),
    returnTo: formData.get("returnTo") || undefined,
  });

  if (!parsed.success) {
    redirect("/dashboard?error=Invalid%20concept%20settings");
  }

  const concept = await prisma.concept.findFirst({
    where: {
      id: parsed.data.questionId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!concept) {
    redirect("/dashboard?error=Concept%20not%20found");
  }

  await prisma.reviewState.upsert({
    where: {
      userId_conceptId: {
        userId,
        conceptId: concept.id,
      },
    },
    create: {
      userId,
      conceptId: concept.id,
      status: "NEW",
      intervalDays: 1,
      repetitionCount: 0,
      nextReviewAt: new Date(),
      lastAnsweredAt: null,
      lastReviewedAt: null,
    },
    update: {
      status: "NEW",
      intervalDays: 1,
      repetitionCount: 0,
      nextReviewAt: new Date(),
      lastAnsweredAt: null,
      lastReviewedAt: null,
    },
  });

  const returnTo = normalizeReturnTo(parsed.data.returnTo);
  revalidatePath("/dashboard");
  revalidatePath(returnTo);
  revalidatePath(`/quiz/${concept.id}`);
  redirect(returnTo);
}

export async function deleteConceptAction(formData: FormData) {
  const userId = await requireAuthUserId();

  const parsed = questionDeleteSchema.safeParse({
    questionId: formData.get("questionId"),
    returnTo: formData.get("returnTo") || undefined,
    confirmDelete: formData.get("confirmDelete"),
  });

  if (!parsed.success) {
    redirect("/dashboard?error=Invalid%20concept%20settings");
  }

  const concept = await prisma.concept.findFirst({
    where: {
      id: parsed.data.questionId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!concept) {
    redirect("/dashboard?error=Concept%20not%20found");
  }

  await prisma.concept.delete({
    where: {
      id: concept.id,
    },
    select: {
      id: true,
    },
  });

  const returnTo = normalizeReturnTo(parsed.data.returnTo);
  revalidatePath("/dashboard");
  revalidatePath(returnTo);
  redirect(returnTo);
}
