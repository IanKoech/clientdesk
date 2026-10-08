import { config } from "dotenv";
config({ path: ".env.local" });
config();
const { auth } = await import("../src/lib/auth");
const { db } = await import("../src/lib/db");
const { readFile } = await import("node:fs/promises");
try {
  const context = await auth.$context;
  await context.runMigrations();
  await db.query(
    await readFile(
      new URL("../db/migrations/002_business.sql", import.meta.url),
      "utf8",
    ),
  );
  console.info("ClientDesk database is ready.");
} finally {
  await db.end();
}
