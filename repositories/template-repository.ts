import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { categories, templates } from "@/db/schema";
import type { Category, Template, TemplateWithCategory } from "@/types/template";

type TemplateRow = typeof templates.$inferSelect;
type CategoryRow = typeof categories.$inferSelect;

function toTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    categoryId: row.categoryId,
    previewUrl: row.previewUrl,
    isPublished: row.isPublished,
    isTrending: row.isTrending,
    position: row.position,
  };
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    position: row.position,
  };
}

const publishedOrder = [
  desc(templates.isTrending),
  asc(templates.position),
  desc(templates.createdAt),
] as const;

export async function listPublishedTemplates(options?: {
  categorySlug?: string;
}): Promise<TemplateWithCategory[]> {
  const filters = [eq(templates.isPublished, true)];

  if (options?.categorySlug) {
    filters.push(eq(categories.slug, options.categorySlug));
  }

  const rows = await db
    .select({ template: templates, category: categories })
    .from(templates)
    .innerJoin(categories, eq(templates.categoryId, categories.id))
    .where(and(...filters))
    .orderBy(...publishedOrder);

  return rows.map((row) => ({
    ...toTemplate(row.template),
    category: toCategory(row.category),
  }));
}

export async function findPublishedTemplateBySlug(
  slug: string,
): Promise<TemplateWithCategory | null> {
  const [row] = await db
    .select({ template: templates, category: categories })
    .from(templates)
    .innerJoin(categories, eq(templates.categoryId, categories.id))
    .where(and(eq(templates.slug, slug), eq(templates.isPublished, true)))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    ...toTemplate(row.template),
    category: toCategory(row.category),
  };
}

export async function findTemplatePromptById(
  id: string,
): Promise<string | null> {
  const [row] = await db
    .select({ prompt: templates.prompt })
    .from(templates)
    .where(and(eq(templates.id, id), eq(templates.isPublished, true)))
    .limit(1);

  return row?.prompt ?? null;
}
