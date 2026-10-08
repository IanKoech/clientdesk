import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
config({ path: ".env.local" });
config();
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 12)
  throw new Error(
    "Set DEMO_PASSWORD to at least 12 characters before seeding.",
  );
const { auth } = await import("../src/lib/auth");
const { db } = await import("../src/lib/db");
const seeder = betterAuth({
  ...auth.options,
  emailVerification: {
    ...auth.options.emailVerification,
    sendVerificationEmail: async () => {},
  },
  rateLimit: { enabled: false },
});
async function demoUser(name: string, email: string) {
  const existing = await db.query('SELECT id FROM "user" WHERE email=$1', [
    email,
  ]);
  if (existing.rowCount) return existing.rows[0].id as string;
  const result = await seeder.api.signUpEmail({
    body: { name, email, password: password! },
  });
  await db.query('UPDATE "user" SET "emailVerified"=true WHERE id=$1', [
    result.user.id,
  ]);
  return result.user.id;
}
try {
  const owner = await demoUser("Ian Demo", "freelancer@clientdesk.demo");
  const client = await demoUser("Amara Demo", "client@clientdesk.demo");
  const connection = await db.connect();
  try {
    await connection.query("BEGIN");
    await connection.query("SELECT pg_advisory_xact_lock(73501922)");
    let workspace = (
      await connection.query(
        "SELECT id FROM organization WHERE slug='clientdesk-demo'",
      )
    ).rows[0]?.id as string | undefined;
    if (workspace) {
      const owns = await connection.query(
        `SELECT 1 FROM member WHERE "organizationId"=$1 AND "userId"=$2 AND role='owner'`,
        [workspace, owner],
      );
      if (!owns.rowCount)
        throw new Error("The demo workspace belongs to another account.");
    } else {
      workspace = randomUUID();
      await connection.query(
        'INSERT INTO organization(id,name,slug,"createdAt") VALUES($1,$2,$3,NOW())',
        [workspace, "Demo Studio", "clientdesk-demo"],
      );
      await connection.query(
        'INSERT INTO member(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,NOW())',
        [randomUUID(), workspace, owner, "owner"],
      );
    }
    await connection.query(
      'INSERT INTO member(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,NOW()) ON CONFLICT DO NOTHING',
      [randomUUID(), workspace, client, "member"],
    );
    const existing = await connection.query(
      "SELECT id FROM project WHERE workspace_id=$1",
      [workspace],
    );
    if (!existing.rowCount) {
      const p = await connection.query(
        "INSERT INTO project(workspace_id,name,description,category,due_date) VALUES($1,$2,$3,$4,CURRENT_DATE+14) RETURNING id",
        [
          workspace,
          "Savanna brand identity",
          "A warm, thoughtful identity for Savanna Coffee.",
          "Brand design",
        ],
      );
      const id = p.rows[0].id;
      await connection.query(
        "INSERT INTO project_client(project_id,workspace_id,user_id) VALUES($1,$2,$3)",
        [id, workspace, client],
      );
      await connection.query(
        "INSERT INTO milestone(project_id,workspace_id,name,status,due_date) VALUES($1,$2,$3,'approved',CURRENT_DATE+3)",
        [id, workspace, "Discovery & direction"],
      );
      const m = await connection.query(
        "INSERT INTO milestone(project_id,workspace_id,name,status,due_date) VALUES($1,$2,$3,'awaiting_approval',CURRENT_DATE+7) RETURNING id",
        [id, workspace, "Visual identity"],
      );
      const content = Buffer.from(
        "Savanna Coffee: warm colors, considered typography, and a distinctive mark. Please review this direction.",
      );
      await connection.query(
        "INSERT INTO deliverable(workspace_id,project_id,milestone_id,storage_key,original_name,mime_type,size_bytes,uploaded_by,content) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          workspace,
          id,
          m.rows[0].id,
          randomUUID(),
          "brand-direction.txt",
          "text/plain",
          content.length,
          owner,
          content,
        ],
      );
      await connection.query(
        "INSERT INTO comment(workspace_id,project_id,author_id,body) VALUES($1,$2,$3,$4)",
        [
          workspace,
          id,
          client,
          "Thanks for sharing the first direction. The warm palette is looking great.",
        ],
      );
      await connection.query(
        "INSERT INTO invoice(workspace_id,project_id,number,amount_minor,currency,status,due_date) VALUES($1,$2,$3,$4,$5,'sent',CURRENT_DATE+10)",
        [workspace, id, "DEMO-001", 2500000, "KES"],
      );
      await connection.query(
        "INSERT INTO activity(workspace_id,actor_id,action,metadata) VALUES($1,$2,$3,$4)",
        [
          workspace,
          owner,
          "Demo project created",
          JSON.stringify({ projectId: id, name: "Savanna brand identity" }),
        ],
      );
    }
    await connection.query("COMMIT");
    console.info(
      "Demo accounts ready: freelancer@clientdesk.demo / client@clientdesk.demo. Sign in with DEMO_PASSWORD. Existing demo passwords are retained.",
    );
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
} finally {
  await db.end();
}
