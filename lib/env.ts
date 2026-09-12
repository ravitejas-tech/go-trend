import { z } from "zod";

const serverEnvSchema = z.object({
  TURSO_DATABASE_URL: z.string().min(1).default("file:./local.db"),
  TURSO_AUTH_TOKEN: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_IMAGE_MODEL: z.string().min(1).default("gemini-2.5-flash-image"),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid server environment: ${parsed.error.issues
      .map((issue) => `${issue.path.join(".")} ${issue.message}`)
      .join("; ")}`,
  );
}

export const env = parsed.data;

export const isGenerationConfigured = Boolean(env.GEMINI_API_KEY);
export const isBlobConfigured = Boolean(env.BLOB_READ_WRITE_TOKEN);
