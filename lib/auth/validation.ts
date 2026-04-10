import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(100),
  legalAcceptance: z.literal("on"),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(100),
});

export const nodeCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  parentId: z.cuid().optional(),
  returnTo: z.string().startsWith("/").optional(),
});

export const nodeUpdateSchema = z.object({
  nodeId: z.cuid(),
  title: z.string().trim().min(1).max(120),
});
export const nodeDeleteSchema = z.object({
  nodeId: z.cuid(),
});

export const nodeTocDeleteSchema = nodeDeleteSchema.extend({
  returnTo: z.string().startsWith("/"),
  confirmDelete: z.literal("DELETE"),
});

export const questionCreateSchema = z.object({
  nodeId: z.cuid(),
  body: z.string().trim().min(1).max(1000),
  returnTo: z.string().startsWith("/").optional(),
});

export const generatedNodeQuestionAddSchema = z.object({
  nodeId: z.cuid(),
  body: z.string().trim().min(1).max(1000),
  returnTo: z.string().startsWith("/").optional(),
});

export const questionSettingsSchema = z.object({
  questionId: z.cuid(),
  returnTo: z.string().startsWith("/").optional(),
});

export const questionDeleteSchema = questionSettingsSchema.extend({
  confirmDelete: z.literal("DELETE"),
});

export const quizInteractionSchema = z.object({
  questionId: z.cuid(),
  intent: z.enum(["hint", "reveal", "submit"]),
  answer: z.string().max(4000).optional(),
  from: z.string().startsWith("/").optional(),
  mode: z.string().trim().min(1).max(32).optional(),
});
