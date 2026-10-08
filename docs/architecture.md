# Architecture

Next.js serves the React UI and Node.js route handlers from one origin. Better Auth owns account, session, verification, organization, member, invitation, and rate-limit tables. PostgreSQL persists authentication and business data. No authentication tokens are stored in browser local storage.

## Registration and onboarding

A freelancer registers with a name, email, and password. Email verification is mandatory. A valid verification link starts a session and redirects to onboarding. Workspace creation uses Better Auth’s organization endpoint, making the creator the owner. The dashboard reads the session on the server and checks actual membership before rendering a workspace.

An invited client registers or signs in using the invitation’s email, verifies that account, reopens the invitation link, and accepts it. Better Auth checks the invitation and its expiry. The invitation acceptance page is wired; the owner-facing invitation UI is next-release work.

## Authorization

Accounts do not carry a global “freelancer” or “client” flag. Membership roles belong to a workspace: owner is the freelancer; member represents a client. This permits one person to own one workspace and be a client in another. Never trust a workspace ID supplied by a browser without looking up the caller’s membership.

`getWorkspaceMembership` binds a user ID and organization ID in one parameterized database query. The dashboard does not infer access from an active-organization cookie alone. The schema gives business records workspace IDs and uses composite foreign keys so a milestone or invoice cannot refer to a project in another workspace.

Client membership is not permission to read every project in a workspace. `project_client` will be checked alongside membership in all future client project APIs. No business APIs exist yet; the schema alone does not implement this authorization.

## Money and files

Invoices store amounts in integer minor units, avoiding floating-point currency errors. Currency is recorded explicitly. Deliverables store metadata and object keys, rather than file bytes or public URLs. Future upload endpoints must validate type and size, verify project access, and issue short-lived private storage URLs.

## Email and deployment

Local email links appear in the server terminal. Production requires SMTP; missing delivery configuration raises an error rather than printing live reset links. Database-backed auth rate limiting is shared across Node processes. Deployment migrations are additive for this foundation; introduce versioned transactional migrations as the schema evolves.

## Validation limits

Integration tests cover verification-required sign-in, persistent sessions, logout, workspace ownership, member isolation, and cross-workspace foreign-key enforcement. A build validates TypeScript and all page modules. Full browser journeys, invitation abuse cases, and upload security tests belong to the feature releases that introduce those workflows.

Auth flow tests disable throttling to exercise multiple sign-ins quickly, then check throttling separately using an isolated in-memory rate-limit bucket. Production uses database-backed buckets. Configure trusted proxy IP forwarding for the deployment host; without a client IP, the auth library falls back to a shared bucket.
