import { Pool } from "pg";
const globalForDb = globalThis as unknown as { clientdeskPool?: Pool };
export const db =
  globalForDb.clientdeskPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.clientdeskPool = db;
