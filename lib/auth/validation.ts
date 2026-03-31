import { z } from "zod";

import { GENERATED_QUESTION_SUGGESTION_COUNT, MAX_GENERATED_QUESTION_LENGTH } from "@/lib/quiz/constants";

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(100),
});

export const nodeCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  parentId: z.string().cuid().optional(),
  returnTo: z.string().startsWith("/").optional(),
});

export const nodeUpdateSchema = z.object({
  nodeId: z.string().cuid(),
  title: z.string().trim().min(1).max(120),
});
export const nodeDeleteSchema = z.object({
  nodeId: z.string().cuid(),
});

export const questionCreateSchema = z.object({
  nodeId: z.string().cuid(),
  body: z.string().trim().min(1).max(1000),
  returnTo: z.string().startsWith("/").optional(),
});

export const questionGenerateSchema = z.object({
  nodeId: z.string().cuid(),
  returnTo: z.string().startsWith("/").optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const generatedNodeQuestionAddSchema = z.object({
  nodeId: z.string().cuid(),
  body: z.string().trim().min(1).max(1000),
  returnTo: z.string().startsWith("/").optional(),
});

export const questionSettingsSchema = z.object({
  questionId: z.string().cuid(),
  returnTo: z.string().startsWith("/").optional(),
});

export const questionDeleteSchema = questionSettingsSchema.extend({
  confirmDelete: z.literal("DELETE"),
});

export const questionAttemptCreateSchema = z.object({
  questionId: z.string().cuid(),
  answer: z.string().trim().min(1).max(4000),
  from: z.string().startsWith("/").optional(),
  mode: z.string().trim().min(1).max(32).optional(),
});

export const questionAttemptResetSchema = z.object({
  questionId: z.string().cuid(),
  from: z.string().startsWith("/").optional(),
  mode: z.string().trim().min(1).max(32).optional(),
});

export const questionHintRequestSchema = z.object({
  questionId: z.string().cuid(),
  from: z.string().startsWith("/").optional(),
  mode: z.string().trim().min(1).max(32).optional(),
  hint1: z.string().trim().min(1).max(400).optional(),
  hint2: z.string().trim().min(1).max(400).optional(),
  hint3: z.string().trim().min(1).max(400).optional(),
});

const generatedQuestionFieldSchema = z.string().trim().min(1).max(MAX_GENERATED_QUESTION_LENGTH).optional();

export const generatedQuestionAddSchema = z.object({
  questionId: z.string().cuid(),
  from: z.string().startsWith("/").optional(),
  mode: z.string().trim().min(1).max(32).optional(),
  candidateIndex: z.coerce.number().int().min(0).max(GENERATED_QUESTION_SUGGESTION_COUNT - 1),
  generated1: generatedQuestionFieldSchema,
  generated2: generatedQuestionFieldSchema,
  generated3: generatedQuestionFieldSchema,
});

export const generatedQuestionAddAllSchema = z.object({
  questionId: z.string().cuid(),
  from: z.string().startsWith("/").optional(),
  mode: z.string().trim().min(1).max(32).optional(),
  generated1: generatedQuestionFieldSchema,
  generated2: generatedQuestionFieldSchema,
  generated3: generatedQuestionFieldSchema,
});
