import type { z } from "zod";

import type {
  categorySchema,
  templateCreateSchema,
  templateSchema,
  templateUpdateSchema,
  templateWithCategorySchema,
} from "@/schemas/template";

export type Category = z.infer<typeof categorySchema>;
export type Template = z.infer<typeof templateSchema>;
export type TemplateWithCategory = z.infer<typeof templateWithCategorySchema>;
export type TemplateCreate = z.infer<typeof templateCreateSchema>;
export type TemplateUpdate = z.infer<typeof templateUpdateSchema>;

export type AdminTemplate = Template & { prompt: string };
