import { z } from "zod";

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
