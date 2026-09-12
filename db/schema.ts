import { sql } from "drizzle-orm";
import {
  blob,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { GENERATION_STATUSES } from "@/lib/constants/generation";
import { USER_ROLES } from "@/lib/constants/roles";

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  imageUrl: text("image_url"),
  role: text("role", { enum: USER_ROLES }).notNull().default("user"),
  ...timestamps,
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  ...timestamps,
}, (table) => [uniqueIndex("categories_slug_unique").on(table.slug)]);

export const templates = sqliteTable("templates", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  prompt: text("prompt").notNull(),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "restrict" }),
  previewUrl: text("preview_url").notNull(),
  thumbnail: blob("thumbnail", { mode: "buffer" }),
  isPublished: integer("is_published", { mode: "boolean" })
    .notNull()
    .default(false),
  isTrending: integer("is_trending", { mode: "boolean" })
    .notNull()
    .default(false),
  position: integer("position").notNull().default(0),
  ...timestamps,
}, (table) => [
  uniqueIndex("templates_slug_unique").on(table.slug),
  index("templates_category_idx").on(table.categoryId),
  index("templates_published_idx").on(table.isPublished, table.isTrending),
]);

export const generations = sqliteTable("generations", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  templateId: text("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "restrict" }),
  status: text("status", { enum: GENERATION_STATUSES })
    .notNull()
    .default("pending"),
  sourceUrl: text("source_url").notNull(),
  outputUrl: text("output_url"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  durationMs: integer("duration_ms"),
  completedAt: text("completed_at"),
  ...timestamps,
}, (table) => [
  index("generations_user_idx").on(table.userId, table.createdAt),
  index("generations_template_idx").on(table.templateId),
  index("generations_status_idx").on(table.status),
]);
