import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { categories, templates } from "./schema";
import { SEED_CATEGORIES, SEED_TEMPLATES } from "./seed-data";

const PREVIEW_BASE = "https://images.unsplash.com/photo";

const PREVIEW_BY_SLUG: Record<string, string> = {
  "90s-disposable-camera": `${PREVIEW_BASE}-1503185912284-5271ff81b9a8?w=1200&q=70`,
  "linkedin-headshot": `${PREVIEW_BASE}-1507003211169-0a1dd7228f2d?w=1200&q=70`,
  "teal-orange-cinematic": `${PREVIEW_BASE}-1519085360753-af0119f7cbe7?w=1200&q=70`,
  "polaroid-1970s": `${PREVIEW_BASE}-1516726817505-f5ed825624d8?w=1200&q=70`,
  "anime-cel-shaded": `${PREVIEW_BASE}-1531427186611-ecfd6d936c79?w=1200&q=70`,
  "golden-hour-glow": `${PREVIEW_BASE}-1529626455594-4ff0802cfb7e?w=1200&q=70`,
  "editorial-fashion": `${PREVIEW_BASE}-1524504388940-b1c1722653e1?w=1200&q=70`,
  "vhs-camcorder": `${PREVIEW_BASE}-1502767089025-6572583495f9?w=1200&q=70`,
};

async function run() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:./local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(client);

  await db
    .insert(categories)
    .values(
      SEED_CATEGORIES.map((category) => ({
        id: `cat_${category.slug}`,
        slug: category.slug,
        name: category.name,
        description: category.description,
        position: category.position,
      })),
    )
    .onConflictDoUpdate({
      target: categories.slug,
      set: { name: categories.name, description: categories.description },
    });

  await db
    .insert(templates)
    .values(
      SEED_TEMPLATES.map((template) => ({
        id: `tpl_${template.slug}`,
        slug: template.slug,
        title: template.title,
        description: template.description,
        prompt: template.prompt,
        categoryId: `cat_${template.categorySlug}`,
        previewUrl: PREVIEW_BY_SLUG[template.slug] ?? "",
        isPublished: true,
        isTrending: template.isTrending,
        position: template.position,
      })),
    )
    .onConflictDoUpdate({
      target: templates.slug,
      set: {
        title: templates.title,
        description: templates.description,
        prompt: templates.prompt,
        isTrending: templates.isTrending,
      },
    });

  console.log(
    `seeded ${SEED_CATEGORIES.length} categories, ${SEED_TEMPLATES.length} templates`,
  );
  client.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
