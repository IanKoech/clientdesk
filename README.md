# ClientDesk

A calmer home for freelance projects and client collaboration.

ClientDesk is a working freelancer/client portal built with **Next.js, React, Tailwind CSS, TypeScript, Node.js, and PostgreSQL**. Montserrat is self-hosted and used throughout the interface.

![Freelancer dashboard](docs/screenshots/dashboard.png)

![Project milestones, deliverables, clients, and invoices](docs/screenshots/project.png)

## What works

- Registration, mandatory email verification, login/logout, persistent sessions, and password reset.
- Workspace onboarding and switching; server-side session and membership checks.
- Optional Google sign-in when OAuth credentials are configured.
- Freelancer project creation, categories, briefs, due dates, and active/completed/archived states.
- Project-specific client invitations: expiring, single-use links bound to the invited email address.
- Milestones, private deliverable uploads/downloads, client approvals, revision requests, and review history.
- Project comments, client removal, and activity history.
- Draft invoices, sending, manual paid/void states, and browser printing/save-as-PDF.
- Profile changes, password changes, and email-confirmed account deletion.
- Email notifications with an outbox, delivery status, and retries.
- Seeded freelancer/client accounts and a separate read-only `/demo` preview.

Clients see only projects assigned to them. Workspace membership alone does not grant access to every project. Draft invoices are hidden from clients. Freelancers cannot approve their own milestones as clients.

## Local setup

Use the Node version in `.nvmrc`:

```bash
nvm use
npm ci
cp .env.example .env.local
openssl rand -base64 48
```

Put the generated secret in `BETTER_AUTH_SECRET`. Start PostgreSQL with `docker compose up -d`, or set `DATABASE_URL` to a dedicated existing database. If port 5432 is occupied, change the Compose port and connection string, or use your existing PostgreSQL instance.

```bash
npm run db:migrate
npm run dev
```

Visit http://localhost:3000. In development, verification/reset/invitation links appear in the server terminal. Production email delivery requires SMTP.

## Try the complete workflow

1. Register a freelancer and open the email verification link.
2. Create a workspace, then create a project and add a milestone.
3. Invite a client using another email address. Open the client invitation link.
4. In another browser session, register/verify that client account, reopen the invitation, and accept it.
5. Upload a deliverable as the freelancer.
6. Comment, approve, or request changes as the client.
7. Create and send an invoice as the freelancer; record payment manually after receiving it.

## Seeded demo accounts

Set `DEMO_PASSWORD` in `.env.local` to at least 12 characters, then run:

```bash
npm run seed:demo
```

Sign in as `freelancer@clientdesk.demo` or `client@clientdesk.demo` using that password. Both accounts are verified for the sample workspace. The seed includes a project, milestones, a downloadable text deliverable, a comment, and an invoice. It can be rerun without overwriting existing projects or account passwords. Use this only for sample data.

`/demo` remains a separate, read-only preview with illustrative metrics. The authenticated dashboard reads real database records.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

Integration tests use a **separate database** whose name ends in `_test`. They create temporary accounts and remove only their own fixtures.

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clientdesk_test npm run db:migrate
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clientdesk_test npm test
```

Set `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` for tests too. CI starts isolated PostgreSQL and runs migrations, lint, type checking, integration tests, and the production build. Tests cover auth lifecycle, account deletion, invitation expiry/reuse/email mismatch, project isolation, file access, revisions, invoices, and client removal.

The complete registration-to-invoice workflow has also been checked in a real browser. For repeatable screenshots and a seeded UI smoke check, start the app, install a Playwright browser with `npx playwright install chromium`, then run `npm run preview:shots`. You may set `PLAYWRIGHT_BROWSER_PATH` to an installed Chrome executable instead.

## Email and Google configuration

Set the SMTP variables and `EMAIL_FROM` from `.env.example` for production delivery. The Activity page shows project notification delivery status. `npm run notifications:send` processes the outbox; a deployed scheduler can run it every minute. Failed notifications retry up to three attempts automatically; workspace owners can explicitly retry them from Activity.

For optional Google sign-in, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and register `https://YOUR_DOMAIN/api/auth/callback/google` as the OAuth redirect URI. The Google button appears only when both credentials exist. External OAuth has not been exercised without provider credentials.

## Storage and invoices

Uploads support PDF, PNG, JPEG, WebP, and plain text, up to **4 MB per file**. Content signatures/types are checked. Files are stored privately in PostgreSQL for this first release and downloaded through authenticated, project-authorized endpoints. There are no public file URLs. This is convenient for a small portfolio deployment; move large workloads to private object storage later.

Invoice amounts use integer minor units. Printing uses the browser's print dialog and PDF export. Invoice payment tracking is manual; the app does not process payments.

## Deployment status

A public deployment has not been provisioned. Use a Node-compatible Next.js host and managed PostgreSQL; set the environment variables, run `npm run db:migrate`, then `npm run build` and `npm start`. Production must have HTTPS, a dedicated auth secret, configured SMTP, and trusted client-IP forwarding appropriate to the host. Do not enable public demo accounts on a workspace containing real client data.

Account deletion removes workspaces where the deleted user is the only owner. In other workspaces, shared comments/approval history remains labeled `Former user`.

See [architecture notes](docs/architecture.md) for data boundaries and decisions.

## Dependency audit

Production dependencies pass `npm audit --omit=dev`. The Next.js ESLint tooling has an unresolved development-only `braces` advisory; there is currently no patched `braces` release in the registry. Avoid the suggested forced downgrade of the Next.js lint configuration without verifying compatibility.
