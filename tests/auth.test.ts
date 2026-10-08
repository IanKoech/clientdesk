import { config } from "dotenv";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
config({ path: ".env.local" });
config();
if (
  !process.env.DATABASE_URL ||
  !new URL(process.env.DATABASE_URL).pathname.endsWith("_test")
)
  throw new Error("Tests require a dedicated DATABASE_URL ending in _test.");
const { auth } = await import("../src/lib/auth");
const { db } = await import("../src/lib/db");
const { getWorkspaceMembership } = await import("../src/lib/workspaces");
const emails: { email: string; url: string; kind: string }[] = [];
const instance = betterAuth({
  ...auth.options,
  // Functional journeys intentionally exceed sign-in throttles; exercise the limiter separately.
  rateLimit: { enabled: false },
  emailVerification: {
    ...auth.options.emailVerification,
    sendVerificationEmail: async ({ user, url }) => {
      emails.push({ email: user.email, url, kind: "verify" });
    },
  },
  emailAndPassword: {
    ...auth.options.emailAndPassword,
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      emails.push({ email: user.email, url, kind: "reset" });
    },
  },
});
const origin = process.env.BETTER_AUTH_URL || "http://localhost:3000";
async function request(
  path: string,
  body?: unknown,
  cookie?: string,
  customOrigin = origin,
) {
  return instance.handler(
    new Request(`${origin}/api/auth/${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Origin: customOrigin,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}
const cookieFrom = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
test("ClientDesk authentication and workspace boundaries", async (t) => {
  const email = `fixture-${randomUUID()}@example.com`;
  const otherEmail = `fixture-${randomUUID()}@example.com`;
  const password = "strong-test-password-2026";
  let userId = "",
    otherId = "",
    workspaceId = "",
    secondWorkspaceId = "",
    cookie = "";
  try {
    await t.test(
      "registration requires email verification and rejects weak passwords",
      async () => {
        const weak = await request("sign-up/email", {
          name: "Ian Test",
          email,
          password: "short",
        });
        assert.equal(weak.status, 400);
        const created = await request("sign-up/email", {
          name: "Ian Test",
          email,
          password,
          callbackURL: "/onboarding",
        });
        assert.equal(created.status, 200);
        const data = await created.json();
        userId = data.user.id;
        const denied = await request("sign-in/email", { email, password });
        assert.equal(denied.status, 403);
        const verification = emails.findLast(
          (item) => item.email === email && item.kind === "verify",
        );
        assert.ok(verification);
        const verified = await instance.handler(new Request(verification.url));
        assert.ok([200, 302].includes(verified.status));
        const signedIn = await request("sign-in/email", { email, password });
        assert.equal(signedIn.status, 200);
        cookie = cookieFrom(signedIn);
        assert.ok(cookie.includes("session_token"));
      },
    );
    await t.test(
      "sessions persist and missing or forged cookies are rejected",
      async () => {
        const current = await request("get-session", undefined, cookie);
        const data = await current.json();
        assert.equal(data.user.id, userId);
        assert.equal(await (await request("get-session")).json(), null);
        assert.equal(
          await (
            await request(
              "get-session",
              undefined,
              "better-auth.session_token=forged",
            )
          ).json(),
          null,
        );
      },
    );
    await t.test(
      "workspace creation assigns ownership and isolates unrelated users",
      async () => {
        const created = await request(
          "organization/create",
          { name: "Fixture Studio", slug: `fixture-${randomUUID()}` },
          cookie,
        );
        assert.equal(created.status, 200);
        workspaceId = (await created.json()).id;
        const owner = await getWorkspaceMembership(userId, workspaceId);
        assert.equal(owner?.role, "owner");
        const second = await request(
          "organization/create",
          { name: "Other Studio", slug: `fixture-${randomUUID()}` },
          cookie,
        );
        assert.equal(second.status, 200);
        secondWorkspaceId = (await second.json()).id;
        const outsider = await request("sign-up/email", {
          name: "Other Person",
          email: otherEmail,
          password,
        });
        assert.equal(outsider.status, 200);
        otherId = (await outsider.json()).user.id;
        await db.query(
          'UPDATE "user" SET "emailVerified" = true WHERE id = $1',
          [otherId],
        );
        const outsiderLogin = await request("sign-in/email", {
          email: otherEmail,
          password,
        });
        const outsiderCookie = cookieFrom(outsiderLogin);
        assert.equal(await getWorkspaceMembership(otherId, workspaceId), null);
        const forbidden = await request(
          `organization/get-full-organization?organizationId=${workspaceId}`,
          undefined,
          outsiderCookie,
        );
        assert.equal(forbidden.status, 403);
        const crossOrigin = await request(
          "organization/create",
          { name: "Bad", slug: "bad" },
          cookie,
          "https://untrusted.example",
        );
        assert.equal(crossOrigin.status, 403);
      },
    );
    await t.test(
      "business foreign keys reject cross-workspace milestones",
      async () => {
        const project = await db.query<{ id: string }>(
          "INSERT INTO project(workspace_id,name) VALUES($1,$2) RETURNING id",
          [workspaceId, "Fixture project"],
        );
        await assert.rejects(
          db.query(
            "INSERT INTO milestone(project_id,workspace_id,name) VALUES($1,$2,$3)",
            [project.rows[0].id, secondWorkspaceId, "Wrong workspace"],
          ),
          { code: "23503" },
        );
      },
    );
    await t.test(
      "password reset revokes sessions and logout invalidates the new session",
      async () => {
        const reset = await request("request-password-reset", {
          email,
          redirectTo: `${origin}/reset-password`,
        });
        assert.equal(reset.status, 200);
        const resetMail = emails.findLast(
          (item) => item.email === email && item.kind === "reset",
        );
        assert.ok(resetMail);
        const token = new URL(resetMail.url).pathname.split("/").pop();
        assert.ok(token);
        const changed = await request("reset-password", {
          token,
          newPassword: "another-strong-test-password",
        });
        assert.equal(changed.status, 200);
        assert.equal(
          await (await request("get-session", undefined, cookie)).json(),
          null,
        );
        const signedIn = await request("sign-in/email", {
          email,
          password: "another-strong-test-password",
        });
        assert.equal(signedIn.status, 200);
        cookie = cookieFrom(signedIn);
        const logout = await request("sign-out", {}, cookie);
        assert.equal(logout.status, 200);
        assert.equal(
          await (await request("get-session", undefined, cookie)).json(),
          null,
        );
      },
    );
    await t.test(
      "authentication rate limiting rejects repeated requests",
      async () => {
        const limited = betterAuth({
          ...auth.options,
          rateLimit: {
            enabled: true,
            storage: "memory",
            window: 60,
            max: 1,
            customRules: { "/sign-in/email": { window: 60, max: 1 } },
          },
        });
        const login = () =>
          limited.handler(
            new Request(`${origin}/api/auth/sign-in/email`, {
              method: "POST",
              headers: { Origin: origin, "Content-Type": "application/json" },
              body: JSON.stringify({
                email,
                password: "another-strong-test-password",
              }),
            }),
          );
        assert.equal((await login()).status, 200);
        assert.equal((await login()).status, 429);
      },
    );
  } finally {
    for (const id of [workspaceId, secondWorkspaceId].filter(Boolean))
      await db.query("DELETE FROM organization WHERE id=$1", [id]);
    for (const id of [userId, otherId].filter(Boolean))
      await db.query('DELETE FROM "user" WHERE id=$1', [id]);
    await db.end();
  }
});
