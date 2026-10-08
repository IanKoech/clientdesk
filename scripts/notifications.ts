import { config } from "dotenv";
config({ path: ".env.local" });
config();
const { db } = await import("../src/lib/db");
const { deliverPendingEmails } = await import("../src/lib/portal");
try {
  await db.query(
    "UPDATE email_outbox SET status='pending' WHERE status='sending' AND created_at<NOW()-INTERVAL '10 minutes'",
  );
  const workspaces = await db.query(
    "SELECT DISTINCT workspace_id FROM email_outbox WHERE status IN('pending','failed') AND attempts<3",
  );
  for (const row of workspaces.rows)
    await deliverPendingEmails(row.workspace_id);
  console.info("Pending notifications processed.");
} finally {
  await db.end();
}
