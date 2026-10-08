# ClientDesk

A calmer home for freelance projects and client collaboration.

ClientDesk brings workspace membership, projects, milestones, deliverables, feedback, and invoice tracking into a single client portal. This repository is the **foundation release**, not the complete product yet.

## Preview

![ClientDesk demo dashboard](docs/screenshots/dashboard.png)

![ClientDesk registration](docs/screenshots/register.png)

## Stack

- Next.js App Router and React, with TypeScript
- Tailwind CSS
- Node.js runtime and PostgreSQL
- Better Auth for accounts, sessions, email verification, password resets, and organizations
- SMTP delivery through Nodemailer; development emails appear in the server terminal

## Working in this release

- Responsive landing page and a clearly labeled demo dashboard
- Email/password registration, verification, sign-in, sign-out, and reset screens
- Verification-required accounts and seven-day database-backed sessions
- Password reset revokes existing sessions
- Auth rate limiting stored in PostgreSQL
- Workspace onboarding and a server-protected dashboard
- Membership checks that derive workspace access from the signed-in user
- Expiring organization invitations and an acceptance screen
- Business schema for projects, project clients, milestones, deliverables, comments, invoices, and activity

The dashboard modules marked “Soon” are not implemented. Demo projects and metrics are illustrative and do not represent real accounts or database records. The authenticated dashboard starts empty.

## Local development

Use the Node version in `.nvmrc`:

```bash
nvm use
npm ci
cp .env.example .env.local
openssl rand -base64 48
```

Put the generated secret in `BETTER_AUTH_SECRET`. Start PostgreSQL using `docker compose up -d`, or set `DATABASE_URL` to a dedicated local database. If port 5432 is already occupied, use your existing PostgreSQL instance or change the Compose port and connection string.

```bash
npm run db:migrate
npm run dev
```

Visit http://localhost:3000. `/demo` is available without a database account. For real onboarding: register → open the verification link printed in the server terminal → create a workspace → view the protected dashboard.

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

Set `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` for tests too. The test suite does not send production emails. CI starts an isolated PostgreSQL service.

## Next release

1. Freelancer project creation, client invitations, and project-specific client access.
2. Milestones, comments, deliverable uploads, and approval history.
3. Invoice generation and manual payment-status tracking; real payment processing comes later.
4. Profile settings, password changes, account deletion, and optional Google sign-in.
5. Activity feed, notification delivery, seeded database demo accounts, and browser flow tests.

## Deployment

Deployment is not provisioned yet. Use a Node-compatible Next.js host with managed PostgreSQL. Run `npm run db:migrate` as a release step, and set `DATABASE_URL`, `BETTER_AUTH_URL`, a fresh `BETTER_AUTH_SECRET`, and SMTP variables from `.env.example`. Use HTTPS and configure your SMTP sender domain. Never reuse development credentials in production.

Before publishing the complete demo, finish project-level client authorization and the remaining flows above. Storage for deliverables will use private object storage and short-lived download URLs; it is not wired in this release.

See [architecture notes](docs/architecture.md) for data boundaries and implementation decisions.

## Dependency audit

Production dependencies currently pass `npm audit --omit=dev`. The generated Next.js ESLint tooling has an unresolved development-only `braces` advisory; the registry currently offers no patched `braces` release. Do not apply the suggested forced downgrade of the Next.js lint configuration without checking compatibility.
