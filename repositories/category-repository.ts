import { asc } from "drizzle-orm";

import { db } from "@/db/client";
import { categories } from "@/db/schema";
import type { Category } from "@/types/template";

type CategoryRow = typeof categories.$inferSelect;

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    position: row.position,
  };
}

export async function listCategories(): Promise<Category[]> {
  const rows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.position), asc(categories.name));

  return rows.map(toCategory);
}
