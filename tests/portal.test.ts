import { config } from "dotenv";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
config({ path: ".env.local" });
config();
if (
  !process.env.DATABASE_URL ||
  !new URL(process.env.DATABASE_URL).pathname.endsWith("_test")
)
  throw new Error("Use a dedicated _test database.");
const { db } = await import("../src/lib/db");
const { handlePortalRequest, acceptProjectInvitation, portalError } =
  await import("../src/lib/portal");
const origin = process.env.BETTER_AUTH_URL!;
const owner = {
  id: randomUUID(),
  email: `owner-${randomUUID()}@example.com`,
  name: "Test Freelancer",
};
const client = {
  id: randomUUID(),
  email: `client-${randomUUID()}@example.com`,
  name: "Test Client",
};
const outsider = {
  id: randomUUID(),
  email: `other-${randomUUID()}@example.com`,
  name: "Other Client",
};
const workspace = randomUUID(),
  otherWorkspace = randomUUID();
const deliveries: string[] = [];
async function call(
  path: string,
  method = "GET",
  body?: unknown,
  user = owner,
  w = workspace,
) {
  const request = new Request(`${origin}/api/workspaces/${w}/${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  try {
    return await handlePortalRequest(
      request,
      w,
      path ? path.split("/") : [],
      user,
    );
  } catch (error) {
    return portalError(error);
  }
}
async function accept(token: string, user = client) {
  try {
    return Response.json(
      await acceptProjectInvitation(
        new Request(origin, { method: "POST", headers: { Origin: origin } }),
        token,
        user,
      ),
    );
  } catch (error) {
    return portalError(error);
  }
}
function latestToken() {
  const text = deliveries.findLast((value) => value.includes("/invite/"));
  assert.ok(text);
  const match = text.match(/\/invite\/([a-f0-9]{64})/);
  assert.ok(match);
  return match[1];
}
function upload(text = "First draft", type = "text/plain") {
  const form = new FormData();
  form.set(
    "file",
    new File([text], type === "text/plain" ? "draft.txt" : "fake.pdf", {
      type,
    }),
  );
  return form;
}

test("Freelancer-to-client project workflow and isolation", async (t) => {
  const log = console.info;
  console.info = (...args: unknown[]) => {
    deliveries.push(args.join(" "));
  };
  let project = "",
    privateProject = "",
    milestone = "",
    fileId = "",
    invoiceId = "";
  try {
    for (const user of [owner, client, outsider])
      await db.query(
        'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,true,NOW(),NOW())',
        [user.id, user.name, user.email],
      );
    for (const [id, name] of [
      [workspace, "Fixture studio"],
      [otherWorkspace, "Other studio"],
    ]) {
      await db.query(
        'INSERT INTO organization(id,name,slug,"createdAt") VALUES($1,$2,$3,NOW())',
        [id, name, randomUUID()],
      );
      await db.query(
        'INSERT INTO member(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,NOW())',
        [randomUUID(), id, owner.id, "owner"],
      );
    }
    await t.test(
      "freelancer creates persisted projects and milestone",
      async () => {
        const created = await call("projects", "POST", {
          name: "Brand project",
          category: "Brand design",
          description: "A collaborative identity",
        });
        assert.equal(created.status, 201);
        project = (await created.json()).project.id;
        const second = await call("projects", "POST", {
          name: "Confidential project",
        });
        assert.equal(second.status, 201);
        privateProject = (await second.json()).project.id;
        const added = await call(`projects/${project}/milestones`, "POST", {
          name: "First draft",
          due_date: "2026-12-01",
        });
        assert.equal(added.status, 201);
        milestone = (await added.json()).milestone.id;
        const detail = await (await call(`projects/${project}`)).json();
        assert.equal(detail.milestones[0].name, "First draft");
        assert.equal(detail.milestones[0].due_date, "2026-12-01");
        assert.equal(
          (
            await call("projects", "POST", {
              name: "Invalid date",
              due_date: "2026-02-30",
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      "invitations require the intended verified account, expire, and are single use",
      async () => {
        assert.equal(
          (
            await call(`projects/${project}/invitations`, "POST", {
              email: client.email,
            })
          ).status,
          201,
        );
        let token = latestToken();
        assert.equal((await accept(token, outsider)).status, 403);
        await db.query(
          "UPDATE project_invitation SET expires_at=NOW()-INTERVAL '1 second' WHERE project_id=$1",
          [project],
        );
        assert.equal((await accept(token)).status, 410);
        assert.equal(
          (
            await call(`projects/${project}/invitations`, "POST", {
              email: client.email,
            })
          ).status,
          201,
        );
        token = latestToken();
        assert.equal((await accept(token)).status, 200);
        assert.equal((await accept(token)).status, 410);
        const stored = await db.query(
          "SELECT token_hash FROM project_invitation WHERE project_id=$1",
          [project],
        );
        assert.ok(stored.rows.every((row) => row.token_hash !== token));
      },
    );
    await t.test(
      "client sees only assigned project and cannot perform owner mutations",
      async () => {
        const snapshot = await (
          await call("", "GET", undefined, client)
        ).json();
        assert.equal(snapshot.projects.length, 1);
        assert.equal(snapshot.projects[0].id, project);
        assert.equal(
          (await call(`projects/${privateProject}`, "GET", undefined, client))
            .status,
          404,
        );
        assert.equal(
          (await call(`projects/${project}`, "GET", undefined, outsider))
            .status,
          403,
        );
        assert.equal(
          (
            await call(
              `projects/${project}`,
              "GET",
              undefined,
              owner,
              otherWorkspace,
            )
          ).status,
          404,
        );
        assert.equal(
          (await call("projects", "POST", { name: "Unauthorized" }, client))
            .status,
          403,
        );
        assert.equal(
          (
            await call(
              `projects/${project}/milestones`,
              "POST",
              { name: "Unauthorized" },
              client,
            )
          ).status,
          403,
        );
      },
    );
    await t.test(
      "uploads validate bytes and remain private with permission-checked downloads",
      async () => {
        assert.equal(
          (
            await call(
              `projects/${project}/milestones/${milestone}/deliverables`,
              "POST",
              upload(),
              client,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await call(
              `projects/${project}/milestones/${milestone}/deliverables`,
              "POST",
              upload("not a pdf", "application/pdf"),
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await call(
              `projects/${project}/milestones/${milestone}/deliverables`,
              "POST",
              upload(),
            )
          ).status,
          201,
        );
        const detail = await (await call(`projects/${project}`)).json();
        fileId = detail.deliverables[0].id;
        assert.equal(detail.milestones[0].status, "awaiting_approval");
        const download = await call(
          `projects/${project}/deliverables/${fileId}`,
          "GET",
          undefined,
          client,
        );
        assert.equal(download.status, 200);
        assert.equal(await download.text(), "First draft");
        assert.ok(
          download.headers.get("content-disposition")?.includes("attachment"),
        );
        assert.equal(
          (
            await call(
              `projects/${project}/deliverables/${fileId}`,
              "GET",
              undefined,
              outsider,
            )
          ).status,
          403,
        );
      },
    );
    await t.test(
      "client comments, requests a revision, then approves the revised work",
      async () => {
        assert.equal(
          (
            await call(
              `projects/${project}/comments`,
              "POST",
              { body: "Please adjust the color." },
              client,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await call(`projects/${project}/milestones/${milestone}`, "PATCH", {
              status: "approved",
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await call(
              `projects/${project}/milestones/${milestone}`,
              "PATCH",
              { status: "changes_requested" },
              client,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await call(
              `projects/${project}/milestones/${milestone}`,
              "PATCH",
              { status: "changes_requested", note: "Warmer colors please." },
              client,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await call(
              `projects/${project}/milestones/${milestone}`,
              "PATCH",
              { status: "approved" },
              client,
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await call(
              `projects/${project}/milestones/${milestone}/deliverables`,
              "POST",
              upload("Revised colors"),
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await call(
              `projects/${project}/milestones/${milestone}`,
              "PATCH",
              { status: "approved" },
              client,
            )
          ).status,
          200,
        );
        const detail = await (await call(`projects/${project}`)).json();
        assert.equal(detail.approvals.length, 2);
        assert.equal(detail.comments[0].body, "Please adjust the color.");
        assert.equal(
          (await call(`projects/${project}`, "PATCH", { status: "completed" }))
            .status,
          200,
        );
      },
    );
    await t.test(
      "draft invoices are private and only freelancer records sent/paid states",
      async () => {
        assert.equal(
          (
            await call(`projects/${project}/invoices`, "POST", {
              number: "INV-001",
              amount_minor: 12345,
              currency: "KES",
            })
          ).status,
          201,
        );
        assert.equal(
          (
            await call(`projects/${project}/invoices`, "POST", {
              number: "INV-001",
              amount_minor: 12345,
              currency: "KES",
            })
          ).status,
          409,
        );
        const ownerDetail = await (await call(`projects/${project}`)).json();
        invoiceId = ownerDetail.invoices[0].id;
        const clientDetail = await (
          await call(`projects/${project}`, "GET", undefined, client)
        ).json();
        assert.equal(clientDetail.invoices.length, 0);
        assert.equal(
          (
            await call(
              `projects/${project}/invoices/${invoiceId}`,
              "PATCH",
              { status: "paid" },
              client,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await call(`projects/${project}/invoices/${invoiceId}`, "PATCH", {
              status: "sent",
            })
          ).status,
          200,
        );
        const sent = await (
          await call(`projects/${project}`, "GET", undefined, client)
        ).json();
        assert.equal(sent.invoices[0].amount_minor, "12345");
        assert.equal(
          (
            await call(`projects/${project}/invoices/${invoiceId}`, "PATCH", {
              status: "paid",
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await call(`projects/${project}/invoices/${invoiceId}`, "PATCH", {
              status: "sent",
            })
          ).status,
          409,
        );
        const overview = await (await call("")).json();
        assert.ok(
          overview.activity.some(
            (entry: { action: string }) =>
              entry.action === "Milestone approved",
          ),
        );
        assert.ok(
          overview.emails.every(
            (mail: { status: string }) => mail.status === "sent",
          ),
        );
      },
    );
    await t.test(
      "removing a client immediately revokes project and file access",
      async () => {
        assert.equal(
          (await call(`projects/${project}/clients/${client.id}`, "DELETE", {}))
            .status,
          200,
        );
        assert.equal(
          (await call(`projects/${project}`, "GET", undefined, client)).status,
          404,
        );
        assert.equal(
          (
            await call(
              `projects/${project}/deliverables/${fileId}`,
              "GET",
              undefined,
              client,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await call(
              `projects/${project}/comments`,
              "POST",
              { body: "Should be rejected" },
              client,
            )
          ).status,
          404,
        );
      },
    );
    await t.test(
      "deleting a client retains anonymized shared history",
      async () => {
        await db.query('DELETE FROM "user" WHERE id=$1', [client.id]);
        const detail = await (await call(`projects/${project}`)).json();
        assert.equal(detail.comments[0].author, "Former user");
        assert.equal(detail.approvals[0].reviewer, "Former user");
      },
    );
  } finally {
    console.info = log;
    await db.query("DELETE FROM organization WHERE id=ANY($1::text[])", [
      [workspace, otherWorkspace],
    ]);
    await db.query('DELETE FROM "user" WHERE id=ANY($1::text[])', [
      [owner.id, client.id, outsider.id],
    ]);
    await db.end();
  }
});
