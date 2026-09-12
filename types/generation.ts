import type { z } from "zod";

import type {
  generationCreateSchema,
  generationSchema,
  generationStatusSchema,
} from "@/schemas/generation";

export type GenerationStatus = z.infer<typeof generationStatusSchema>;
export type Generation = z.infer<typeof generationSchema>;
export type GenerationCreate = z.infer<typeof generationCreateSchema>;
