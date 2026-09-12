import { z } from "zod";

export const categorySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  position: z.number().int(),
});

export const templateSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  categoryId: z.string().min(1),
  previewUrl: z.string().min(1),
  isPublished: z.boolean(),
  isTrending: z.boolean(),
  position: z.number().int(),
});

export const templateWithCategorySchema = templateSchema.extend({
  category: categorySchema,
});

export const templateCreateSchema = templateSchema
  .omit({ id: true })
  .extend({ prompt: z.string().min(1) });

export const templateUpdateSchema = templateCreateSchema.partial();
