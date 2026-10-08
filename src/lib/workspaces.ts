import { db } from "./db";
// Every business query must derive tenant access from authenticated membership.
export async function getWorkspaceMembership(
  userId: string,
  organizationId: string,
) {
  const result = await db.query<{
    id: string;
    role: string;
    organizationId: string;
    name: string;
  }>(
    `SELECT m.id, m.role, m."organizationId", o.name FROM member m JOIN organization o ON o.id = m."organizationId" WHERE m."userId" = $1 AND m."organizationId" = $2`,
    [userId, organizationId],
  );
  return result.rows[0] ?? null;
}
export async function listWorkspaces(userId: string) {
  const result = await db.query<{ id: string; name: string; role: string }>(
    `SELECT o.id, o.name, m.role FROM organization o JOIN member m ON m."organizationId" = o.id WHERE m."userId" = $1 ORDER BY o."createdAt"`,
    [userId],
  );
  return result.rows;
}
