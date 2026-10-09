import { randomBytes, randomUUID, createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";
import { db } from "./db";
import { sendEmail } from "./email";
import { getWorkspaceMembership } from "./workspaces";

export type PortalUser = { id: string; email: string; name: string };
export class PortalError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const uuid = z.uuid();
const text = z.string().trim().min(1).max(200);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Enter a valid date.",
  )
  .nullable()
  .optional();
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const isManager = (role: string) => role === "owner" || role === "admin";
async function transaction<T>(fn: (connection: PoolClient) => Promise<T>) {
  const connection = await db.connect();
  try {
    await connection.query("BEGIN");
    const result = await fn(connection);
    await connection.query("COMMIT");
    return result;
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
}
async function activity(
  connection: PoolClient,
  workspace: string,
  user: string,
  action: string,
  metadata: object,
) {
  await connection.query(
    "INSERT INTO activity(workspace_id,actor_id,action,metadata) VALUES($1,$2,$3,$4)",
    [workspace, user, action, JSON.stringify(metadata)],
  );
}
async function notify(
  connection: PoolClient,
  workspace: string,
  project: string,
  actor: string,
  subject: string,
  body: string,
) {
  await connection.query(
    `INSERT INTO email_outbox(workspace_id,recipient,subject,body)
 SELECT $1,u.email,$4,$5 FROM "user" u JOIN member m ON m."userId"=u.id
 WHERE m."organizationId"=$1 AND u.id<>$3 AND (m.role IN ('owner','admin') OR EXISTS(SELECT 1 FROM project_client pc WHERE pc.project_id=$2 AND pc.user_id=u.id))`,
    [workspace, project, actor, subject, body],
  );
}
export async function deliverPendingEmails(workspace: string) {
  const result = await db.query<{
    id: string;
    recipient: string;
    subject: string;
    body: string;
  }>(
    `UPDATE email_outbox SET status='sending',attempts=attempts+1
 WHERE id IN(SELECT id FROM email_outbox WHERE workspace_id=$1 AND status IN ('pending','failed') AND attempts<3 ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED) RETURNING id,recipient,subject,body`,
    [workspace],
  );
  for (const mail of result.rows) {
    try {
      await sendEmail(mail.recipient, mail.subject, mail.body);
      await db.query(
        "UPDATE email_outbox SET status='sent',sent_at=NOW() WHERE id=$1",
        [mail.id],
      );
    } catch (error) {
      console.error(
        "ClientDesk email delivery failed",
        error instanceof Error ? error.message : "Unknown failure",
      );
      await db.query("UPDATE email_outbox SET status='failed' WHERE id=$1", [
        mail.id,
      ]);
    }
  }
}
async function rateLimit(user: string) {
  const result = await db.query<{ requests: number }>(
    `INSERT INTO portal_rate_limit(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET
 requests=CASE WHEN portal_rate_limit.window_start < NOW()-INTERVAL '1 minute' THEN 1 ELSE portal_rate_limit.requests+1 END,
 window_start=CASE WHEN portal_rate_limit.window_start < NOW()-INTERVAL '1 minute' THEN NOW() ELSE portal_rate_limit.window_start END RETURNING requests`,
    [user],
  );
  if (result.rows[0].requests > 120)
    throw new PortalError(
      429,
      "Too many changes. Please try again in a minute.",
    );
}
async function projectAccess(
  workspace: string,
  projectId: string,
  user: string,
  role: string,
) {
  uuid.parse(projectId);
  const result = await db.query(
    `SELECT p.* FROM project p WHERE p.id=$1 AND p.workspace_id=$2 AND ($4::boolean OR EXISTS(SELECT 1 FROM project_client pc WHERE pc.project_id=p.id AND pc.workspace_id=p.workspace_id AND pc.user_id=$3))`,
    [projectId, workspace, user, isManager(role)],
  );
  if (!result.rowCount) throw new PortalError(404, "Project not found.");
  return result.rows[0];
}
export async function overview(workspace: string, user: PortalUser) {
  const membership = await getWorkspaceMembership(user.id, workspace);
  if (!membership)
    throw new PortalError(403, "You do not have access to this workspace.");
  const manager = isManager(membership.role);
  const result = await db.query(
    `SELECT p.*, COALESCE((SELECT round(100.0*COUNT(*) FILTER(WHERE m.status='approved')/NULLIF(COUNT(*),0)) FROM milestone m WHERE m.project_id=p.id),0)::integer AS progress,
 (SELECT COUNT(*)::integer FROM milestone m WHERE m.project_id=p.id AND m.status='awaiting_approval') AS awaiting,
 COALESCE((SELECT string_agg(u.name,', ') FROM project_client pc JOIN "user" u ON u.id=pc.user_id WHERE pc.project_id=p.id),'No client yet') AS client
 FROM project p WHERE p.workspace_id=$1 AND ($3::boolean OR EXISTS(SELECT 1 FROM project_client pc WHERE pc.project_id=p.id AND pc.user_id=$2)) ORDER BY p.created_at DESC`,
    [workspace, user.id, manager],
  );
  const ids = result.rows.map((p) => p.id);
  const invoices = await db.query(
    `SELECT i.*,p.name AS project_name FROM invoice i JOIN project p ON p.id=i.project_id WHERE i.workspace_id=$1 AND i.project_id=ANY($2::uuid[]) AND ($3::boolean OR i.status<>'draft') ORDER BY i.created_at DESC`,
    [workspace, ids, manager],
  );
  const clients = await db.query(
    `SELECT DISTINCT u.id,u.name,u.email,p.name AS project_name FROM project_client pc JOIN "user" u ON u.id=pc.user_id JOIN project p ON p.id=pc.project_id WHERE pc.workspace_id=$1 AND pc.project_id=ANY($2::uuid[])`,
    [workspace, ids],
  );
  const feed = await db.query(
    `SELECT a.id,a.action,a.metadata,a.created_at,u.name AS actor FROM activity a LEFT JOIN "user" u ON u.id=a.actor_id WHERE a.workspace_id=$1 AND (a.metadata->>'projectId')=ANY($2::text[]) ORDER BY a.created_at DESC LIMIT 50`,
    [workspace, ids],
  );
  const invitations = manager
    ? await db.query(
        `SELECT i.id,i.email,i.expires_at,i.accepted_at,p.name AS project_name FROM project_invitation i JOIN project p ON p.id=i.project_id WHERE i.workspace_id=$1 ORDER BY i.expires_at DESC LIMIT 30`,
        [workspace],
      )
    : { rows: [] };
  const emails = manager
    ? await db.query(
        `SELECT id,recipient,subject,status,created_at FROM email_outbox WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 20`,
        [workspace],
      )
    : { rows: [] };
  return {
    workspace: { id: workspace, name: membership.name, role: membership.role },
    projects: result.rows,
    invoices: invoices.rows,
    clients: clients.rows,
    activity: feed.rows,
    invitations: invitations.rows,
    emails: emails.rows,
  };
}
async function projectDetails(
  workspace: string,
  projectId: string,
  user: PortalUser,
  role: string,
) {
  const project = await projectAccess(workspace, projectId, user.id, role);
  const milestones = await db.query(
    "SELECT * FROM milestone WHERE project_id=$1 AND workspace_id=$2 ORDER BY created_at,id",
    [projectId, workspace],
  );
  const files = await db.query(
    "SELECT id,milestone_id,original_name,mime_type,size_bytes,created_at FROM deliverable WHERE project_id=$1 AND workspace_id=$2 ORDER BY created_at DESC",
    [projectId, workspace],
  );
  const comments = await db.query(
    `SELECT c.*,COALESCE(u.name,'Former user') AS author FROM comment c LEFT JOIN "user" u ON u.id=c.author_id WHERE c.project_id=$1 AND c.workspace_id=$2 ORDER BY c.created_at`,
    [projectId, workspace],
  );
  const approvals = await db.query(
    `SELECT a.*,COALESCE(u.name,'Former user') AS reviewer FROM approval a LEFT JOIN "user" u ON u.id=a.user_id WHERE a.project_id=$1 AND a.workspace_id=$2 ORDER BY a.created_at DESC`,
    [projectId, workspace],
  );
  const clients = await db.query(
    `SELECT u.id,u.name,u.email FROM project_client pc JOIN "user" u ON u.id=pc.user_id WHERE pc.project_id=$1 AND pc.workspace_id=$2`,
    [projectId, workspace],
  );
  const invoices = await db.query(
    "SELECT * FROM invoice WHERE project_id=$1 AND workspace_id=$2 AND ($3::boolean OR status<>'draft') ORDER BY created_at DESC",
    [projectId, workspace, isManager(role)],
  );
  return {
    project,
    milestones: milestones.rows,
    deliverables: files.rows,
    comments: comments.rows,
    approvals: approvals.rows,
    clients: clients.rows,
    invoices: invoices.rows,
    role,
  };
}
async function json(request: Request) {
  const raw = await limitedBody(request, 16 * 1024);
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    throw new PortalError(400, "Invalid request data.");
  }
}
async function limitedBody(request: Request, max: number) {
  if (Number(request.headers.get("content-length") || 0) > max)
    throw new PortalError(413, "This file or request is too large.");
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new PortalError(413, "This file or request is too large.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks, size);
}
function fileType(bytes: Buffer, type: string) {
  if (type === "application/pdf")
    return bytes.subarray(0, 5).toString() === "%PDF-";
  if (type === "image/png")
    return bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === "image/jpeg")
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/webp")
    return (
      bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WEBP"
    );
  if (type === "text/plain")
    return (
      !bytes.includes(0) &&
      !new TextDecoder("utf8", { fatal: false }).decode(bytes).includes("�")
    );
  return false;
}
export async function handlePortalRequest(
  request: Request,
  workspace: string,
  path: string[],
  user: PortalUser,
): Promise<Response> {
  const membership = await getWorkspaceMembership(user.id, workspace);
  if (!membership)
    throw new PortalError(403, "You do not have access to this workspace.");
  const manager = isManager(membership.role);
  const write = request.method !== "GET";
  if (write) {
    if (request.headers.get("origin") !== process.env.BETTER_AUTH_URL)
      throw new PortalError(403, "Request origin rejected.");
    await rateLimit(user.id);
  }
  const requireManager = () => {
    if (!manager)
      throw new PortalError(403, "Only the freelancer can make this change.");
  };
  if (!path.length && request.method === "GET")
    return Response.json(await overview(workspace, user));
  if (
    path[0] === "notifications" &&
    path[1] === "retry" &&
    request.method === "POST"
  ) {
    requireManager();
    await db.query(
      "UPDATE email_outbox SET status='pending',attempts=0 WHERE workspace_id=$1 AND (status='failed' OR (status='sending' AND created_at<NOW()-INTERVAL '10 minutes'))",
      [workspace],
    );
    await deliverPendingEmails(workspace);
    return Response.json({ message: "Pending email delivery retried." });
  }
  if (path[0] !== "projects") throw new PortalError(404, "Endpoint not found.");
  if (path.length === 1 && request.method === "POST") {
    requireManager();
    const input = z
      .object({
        name: text,
        description: z.string().trim().max(5000).optional(),
        category: text.optional(),
        due_date: date,
      })
      .parse(await json(request));
    const project = await transaction(async (connection) => {
      const result = await connection.query(
        "INSERT INTO project(workspace_id,name,description,category,due_date) VALUES($1,$2,$3,$4,$5) RETURNING *",
        [
          workspace,
          input.name,
          input.description || null,
          input.category || "General",
          input.due_date || null,
        ],
      );
      await activity(connection, workspace, user.id, "Project created", {
        projectId: result.rows[0].id,
        name: input.name,
      });
      return result.rows[0];
    });
    return Response.json({ project }, { status: 201 });
  }
  const projectId = path[1];
  const project = await projectAccess(
    workspace,
    projectId,
    user.id,
    membership.role,
  );
  if (path.length === 2 && request.method === "GET")
    return Response.json(
      await projectDetails(workspace, projectId, user, membership.role),
    );
  if (path.length === 2 && request.method === "PATCH") {
    requireManager();
    const { status } = z
      .object({ status: z.enum(["active", "completed", "archived"]) })
      .parse(await json(request));
    await transaction(async (c) => {
      if (status === "completed") {
        const pending = await c.query(
          "SELECT 1 FROM milestone WHERE project_id=$1 AND status<>'approved' LIMIT 1",
          [projectId],
        );
        if (pending.rowCount)
          throw new PortalError(
            409,
            "Approve all milestones before completing this project.",
          );
      }
      await c.query(
        "UPDATE project SET status=$1 WHERE id=$2 AND workspace_id=$3",
        [status, projectId, workspace],
      );
      await activity(c, workspace, user.id, `Project ${status}`, { projectId });
    });
    return Response.json({ message: "Project updated." });
  }
  if (
    path.length === 3 &&
    path[2] === "invitations" &&
    request.method === "POST"
  ) {
    requireManager();
    const { email } = z
      .object({ email: z.email().trim().toLowerCase() })
      .parse(await json(request));
    if (email === user.email.toLowerCase())
      throw new PortalError(
        400,
        "Invite your client’s email address, rather than your own.",
      );
    const raw = randomBytes(32).toString("hex");
    await transaction(async (c) => {
      await c.query(
        "UPDATE project_invitation SET expires_at=NOW() WHERE project_id=$1 AND email=$2 AND accepted_at IS NULL",
        [projectId, email],
      );
      await c.query(
        "INSERT INTO project_invitation(token_hash,workspace_id,project_id,email,invited_by,expires_at) VALUES($1,$2,$3,$4,$5,NOW()+INTERVAL '48 hours')",
        [tokenHash(raw), workspace, projectId, email, user.id],
      );
      await c.query(
        "INSERT INTO email_outbox(workspace_id,recipient,subject,body) VALUES($1,$2,$3,$4)",
        [
          workspace,
          email,
          `You’re invited to ${project.name}`,
          `${user.name} invited you to ${project.name} on ClientDesk. Sign in or register with ${email} and accept within 48 hours: ${process.env.BETTER_AUTH_URL}/invite/${raw}`,
        ],
      );
      await activity(c, workspace, user.id, "Client invited", {
        projectId,
        email,
      });
    });
    await deliverPendingEmails(workspace);
    return Response.json(
      {
        message:
          "Invitation created. Check Activity for its email delivery status.",
      },
      { status: 201 },
    );
  }
  if (
    path[2] === "clients" &&
    path.length === 4 &&
    request.method === "DELETE"
  ) {
    requireManager();
    await transaction(async (c) => {
      const result = await c.query(
        "DELETE FROM project_client WHERE project_id=$1 AND workspace_id=$2 AND user_id=$3 RETURNING user_id",
        [projectId, workspace, path[3]],
      );
      if (!result.rowCount) throw new PortalError(404, "Client not found.");
      await c.query(
        `UPDATE project_invitation SET expires_at=NOW() WHERE project_id=$1 AND email=(SELECT email FROM "user" WHERE id=$2) AND accepted_at IS NULL`,
        [projectId, path[3]],
      );
      await activity(c, workspace, user.id, "Client access removed", {
        projectId,
      });
    });
    return Response.json({ message: "Client access removed." });
  }
  if (
    path[2] === "milestones" &&
    path.length === 3 &&
    request.method === "POST"
  ) {
    requireManager();
    const input = z
      .object({ name: text, due_date: date })
      .parse(await json(request));
    if (project.status !== "active")
      throw new PortalError(
        409,
        "Reopen this project before adding milestones.",
      );
    const milestone = await transaction(async (c) => {
      const result = await c.query(
        "INSERT INTO milestone(project_id,workspace_id,name,due_date) VALUES($1,$2,$3,$4) RETURNING *",
        [projectId, workspace, input.name, input.due_date || null],
      );
      await activity(c, workspace, user.id, "Milestone added", {
        projectId,
        name: input.name,
      });
      return result.rows[0];
    });
    return Response.json({ milestone }, { status: 201 });
  }
  if (path[2] === "milestones" && path.length >= 4) {
    if (project.status !== "active")
      throw new PortalError(
        409,
        "Reopen this project before updating its milestones.",
      );
    const milestoneId = uuid.parse(path[3]);
    if (
      path[4] === "deliverables" &&
      path.length === 5 &&
      request.method === "POST"
    ) {
      requireManager();
      const bytes = await limitedBody(request, 4 * 1024 * 1024 + 65536);
      let form: FormData;
      try {
        form = await new Request(request.url, {
          method: "POST",
          headers: {
            "content-type": request.headers.get("content-type") || "",
          },
          body: bytes,
        }).formData();
      } catch {
        throw new PortalError(400, "Choose a file to upload.");
      }
      const file = form.get("file");
      if (!(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024)
        throw new PortalError(400, "Choose a file between 1 byte and 4 MB.");
      const content = Buffer.from(await file.arrayBuffer());
      if (!fileType(content, file.type))
        throw new PortalError(
          400,
          "Supported files: PDF, PNG, JPG, WebP, and plain text. The file contents must match its type.",
        );
      const filename =
        file.name.replace(/[\/\x00-\x1f\x7f]/g, "_").slice(0, 200) ||
        "deliverable";
      await transaction(async (c) => {
        const milestone = await c.query(
          "SELECT * FROM milestone WHERE id=$1 AND project_id=$2 AND workspace_id=$3 FOR UPDATE",
          [milestoneId, projectId, workspace],
        );
        if (!milestone.rowCount)
          throw new PortalError(404, "Milestone not found.");
        if (milestone.rows[0].status === "approved")
          throw new PortalError(
            409,
            "Start a new revision before uploading to an approved milestone.",
          );
        await c.query(
          "INSERT INTO deliverable(workspace_id,project_id,milestone_id,storage_key,original_name,mime_type,size_bytes,uploaded_by,content) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [
            workspace,
            projectId,
            milestoneId,
            randomUUID(),
            filename,
            file.type,
            file.size,
            user.id,
            content,
          ],
        );
        await c.query(
          "UPDATE milestone SET status='awaiting_approval' WHERE id=$1",
          [milestoneId],
        );
        await activity(c, workspace, user.id, "Deliverable submitted", {
          projectId,
          milestoneId,
          name: filename,
        });
        await notify(
          c,
          workspace,
          projectId,
          user.id,
          `Ready for review: ${project.name}`,
          `A new deliverable is ready for review in ${project.name}. Open ${process.env.BETTER_AUTH_URL}/dashboard/projects/${projectId}?workspace=${encodeURIComponent(workspace)}`,
        );
      });
      await deliverPendingEmails(workspace);
      return Response.json(
        { message: "Deliverable uploaded and submitted for approval." },
        { status: 201 },
      );
    }
    if (path.length === 4 && request.method === "PATCH") {
      const input = z
        .object({
          status: z.enum([
            "pending",
            "in_progress",
            "approved",
            "changes_requested",
          ]),
          note: z.string().trim().max(2000).optional(),
        })
        .parse(await json(request));
      if (["approved", "changes_requested"].includes(input.status) && manager)
        throw new PortalError(
          403,
          "Client approval must come from a client assigned to this project.",
        );
      if (!manager && !["approved", "changes_requested"].includes(input.status))
        throw new PortalError(
          403,
          "Only the freelancer can set milestone progress.",
        );
      if (input.status === "changes_requested" && !input.note)
        throw new PortalError(400, "Describe the changes you need.");
      await transaction(async (c) => {
        const locked = await c.query(
          "SELECT * FROM milestone WHERE id=$1 AND project_id=$2 AND workspace_id=$3 FOR UPDATE",
          [milestoneId, projectId, workspace],
        );
        if (!locked.rowCount)
          throw new PortalError(404, "Milestone not found.");
        const old = locked.rows[0];
        if (!manager && old.status !== "awaiting_approval")
          throw new PortalError(409, "This milestone is not awaiting review.");
        if (!manager) {
          const file = await c.query(
            "SELECT 1 FROM deliverable WHERE milestone_id=$1 LIMIT 1",
            [milestoneId],
          );
          if (!file.rowCount)
            throw new PortalError(409, "There is no deliverable to approve.");
          await c.query(
            "INSERT INTO approval(workspace_id,project_id,milestone_id,user_id,decision,note) VALUES($1,$2,$3,$4,$5,$6)",
            [
              workspace,
              projectId,
              milestoneId,
              user.id,
              input.status,
              input.note || null,
            ],
          );
        }
        await c.query("UPDATE milestone SET status=$1 WHERE id=$2", [
          input.status === "changes_requested" ? "in_progress" : input.status,
          milestoneId,
        ]);
        await activity(
          c,
          workspace,
          user.id,
          input.status === "approved"
            ? "Milestone approved"
            : input.status === "changes_requested"
              ? "Changes requested"
              : "Milestone progress updated",
          { projectId, milestoneId, name: old.name, note: input.note || null },
        );
        await notify(
          c,
          workspace,
          projectId,
          user.id,
          `Milestone update: ${project.name}`,
          `${user.name} updated ${old.name}: ${input.status.replaceAll("_", " ")}. ${input.note || ""}`,
        );
      });
      await deliverPendingEmails(workspace);
      return Response.json({ message: "Milestone updated." });
    }
  }
  if (
    path[2] === "deliverables" &&
    path.length === 4 &&
    request.method === "GET"
  ) {
    const result = await db.query(
      "SELECT original_name,mime_type,content FROM deliverable WHERE id=$1 AND project_id=$2 AND workspace_id=$3",
      [uuid.parse(path[3]), projectId, workspace],
    );
    if (!result.rowCount || !result.rows[0].content)
      throw new PortalError(404, "File not found.");
    const file = result.rows[0];
    return new Response(new Uint8Array(file.content), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.original_name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  if (
    path[2] === "comments" &&
    path.length === 3 &&
    request.method === "POST"
  ) {
    const { body } = z
      .object({ body: z.string().trim().min(1).max(5000) })
      .parse(await json(request));
    await transaction(async (c) => {
      await c.query(
        "INSERT INTO comment(workspace_id,project_id,author_id,body) VALUES($1,$2,$3,$4)",
        [workspace, projectId, user.id, body],
      );
      await activity(c, workspace, user.id, "Comment added", { projectId });
      await notify(
        c,
        workspace,
        projectId,
        user.id,
        `New comment: ${project.name}`,
        `${user.name}: ${body}`,
      );
    });
    await deliverPendingEmails(workspace);
    return Response.json({ message: "Comment added." }, { status: 201 });
  }
  if (
    path[2] === "invoices" &&
    path.length === 3 &&
    request.method === "POST"
  ) {
    requireManager();
    const input = z
      .object({
        number: text,
        amount_minor: z.number().int().min(1).max(100000000000),
        currency: z.enum(["KES", "USD", "EUR", "GBP"]),
        due_date: date,
      })
      .parse(await json(request));
    try {
      await transaction(async (c) => {
        await c.query(
          "INSERT INTO invoice(workspace_id,project_id,number,amount_minor,currency,due_date) VALUES($1,$2,$3,$4,$5,$6)",
          [
            workspace,
            projectId,
            input.number,
            input.amount_minor,
            input.currency,
            input.due_date || null,
          ],
        );
        await activity(c, workspace, user.id, "Invoice created", {
          projectId,
          number: input.number,
        });
      });
    } catch (error) {
      if ((error as { code?: string }).code === "23505")
        throw new PortalError(
          409,
          "That invoice number is already in use in this workspace.",
        );
      throw error;
    }
    return Response.json(
      { message: "Draft invoice created." },
      { status: 201 },
    );
  }
  if (
    path[2] === "invoices" &&
    path.length === 4 &&
    request.method === "PATCH"
  ) {
    requireManager();
    const { status } = z
      .object({ status: z.enum(["sent", "paid", "void"]) })
      .parse(await json(request));
    await transaction(async (c) => {
      const row = await c.query(
        "SELECT * FROM invoice WHERE id=$1 AND project_id=$2 AND workspace_id=$3 FOR UPDATE",
        [uuid.parse(path[3]), projectId, workspace],
      );
      if (!row.rowCount) throw new PortalError(404, "Invoice not found.");
      const transitions: Record<string, string[]> = {
        draft: ["sent", "void"],
        sent: ["paid", "void"],
        paid: [],
        void: [],
      };
      if (!transitions[row.rows[0].status].includes(status))
        throw new PortalError(409, "That invoice transition is not allowed.");
      await c.query("UPDATE invoice SET status=$1 WHERE id=$2", [
        status,
        path[3],
      ]);
      await activity(c, workspace, user.id, `Invoice ${status}`, {
        projectId,
        number: row.rows[0].number,
      });
      await notify(
        c,
        workspace,
        projectId,
        user.id,
        `Invoice update: ${project.name}`,
        `Invoice ${row.rows[0].number} is ${status}. Open ClientDesk to view the invoice.`,
      );
    });
    await deliverPendingEmails(workspace);
    return Response.json({ message: "Invoice updated." });
  }
  throw new PortalError(404, "Endpoint not found.");
}
export async function acceptProjectInvitation(
  request: Request,
  raw: string,
  user: PortalUser,
) {
  if (request.headers.get("origin") !== process.env.BETTER_AUTH_URL)
    throw new PortalError(403, "Request origin rejected.");
  await rateLimit(user.id);
  z.string()
    .regex(/^[a-f0-9]{64}$/)
    .parse(raw);
  return transaction(async (c) => {
    const result = await c.query(
      "SELECT * FROM project_invitation WHERE token_hash=$1 FOR UPDATE",
      [tokenHash(raw)],
    );
    const invite = result.rows[0];
    if (
      !invite ||
      invite.accepted_at ||
      new Date(invite.expires_at) <= new Date()
    )
      throw new PortalError(
        410,
        "This invitation has expired or has already been accepted. Ask the freelancer for a new one.",
      );
    if (invite.email.toLowerCase() !== user.email.toLowerCase())
      throw new PortalError(
        403,
        "Sign in with the email address this invitation was sent to.",
      );
    // Organization membership alone is never sufficient for client project access.
    await c.query(
      `INSERT INTO member(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,'member',NOW()) ON CONFLICT DO NOTHING`,
      [randomUUID(), invite.workspace_id, user.id],
    );
    await c.query(
      "INSERT INTO project_client(project_id,workspace_id,user_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [invite.project_id, invite.workspace_id, user.id],
    );
    await c.query(
      "UPDATE project_invitation SET accepted_at=NOW() WHERE id=$1",
      [invite.id],
    );
    await activity(c, invite.workspace_id, user.id, "Client joined", {
      projectId: invite.project_id,
    });
    return { workspaceId: invite.workspace_id, projectId: invite.project_id };
  });
}
export function portalError(error: unknown): Response {
  if (error instanceof PortalError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError)
    return Response.json(
      { error: error.issues[0]?.message || "Invalid input." },
      { status: 400 },
    );
  console.error("ClientDesk request failed", error);
  return Response.json(
    { error: "Unable to complete this request. Please try again." },
    { status: 500 },
  );
}
