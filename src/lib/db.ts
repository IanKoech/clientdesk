import { Pool, types } from "pg";
// A DATE is a calendar day, not a midnight timestamp in the server timezone.
types.setTypeParser(1082, (value) => value);
const globalForDb = globalThis as unknown as { clientdeskPool?: Pool };
export const db =
  globalForDb.clientdeskPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.clientdeskPool = db;
