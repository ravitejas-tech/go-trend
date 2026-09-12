import { z } from "zod";

import { GENERATION_STATUSES } from "@/lib/constants/generation";

export const generationStatusSchema = z.enum(GENERATION_STATUSES);

export const generationSchema = z.object({
  id: z.string().min(1),
  templateId: z.string().min(1),
  status: generationStatusSchema,
  sourceUrl: z.string().min(1),
  outputUrl: z.string().nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string().min(1),
  completedAt: z.string().nullable(),
});

export const generationCreateSchema = z.object({
  templateId: z.string().min(1),
  sourceUrl: z.string().url(),
});
