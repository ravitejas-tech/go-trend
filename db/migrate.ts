import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

async function run() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:./local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  await migrate(drizzle(client), { migrationsFolder: "./db/migrations" });
  client.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
