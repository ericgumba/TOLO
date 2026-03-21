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
  notes: z.string().max(5000).optional(),
  parentId: z.string().cuid().optional(),
});

export const nodeUpdateSchema = z.object({
  nodeId: z.string().cuid(),
  title: z.string().trim().min(1).max(120),
  notes: z.string().max(5000).optional(),
});

export const nodeDeleteSchema = z.object({
  nodeId: z.string().cuid(),
});
