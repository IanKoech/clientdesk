# Architecture

Next.js serves the React UI and Node.js route handlers from one origin. Better Auth owns account, session, verification, organization, member, invitation, and rate-limit tables. PostgreSQL stores auth data, business records, private file content, and the email outbox. Montserrat assets are bundled locally with Fontsource.

## Accounts and workspace roles

Registration requires email verification. Valid verification links start a session and redirect to workspace onboarding. Organization creation makes the freelancer the owner. A person can own one workspace and be a client in another; roles belong to memberships rather than global account flags.

Protected pages read sessions on the server. Business endpoints require a verified session, perform a membership lookup, and verify project-specific access. Workspace selection from URLs or session state never substitutes for authorization. Profile, password changes, deletion confirmation, and optional Google OAuth use Better Auth APIs.

## Project access and invitations

Owners/admins manage workspace projects. Members may read only projects where their user ID appears in `project_client`. That same predicate guards overview lists, details, comments, files, milestones, invoices, and history. Clients cannot create projects, upload freelancer work, change invoice states, or alter project status. Draft invoices remain owner-only. Removing a project client immediately revokes those access predicates.

Project invitations store only a SHA-256 hash of a 256-bit random token. Tokens expire after 48 hours, require the invited email, and are consumed inside a row-locked transaction. Acceptance creates workspace membership if necessary and assigns exactly one project. A unique workspace/user membership index prevents duplicates. Resending an invitation expires earlier unaccepted links for that project/email.

## Workflow integrity

Project data and audit entries are written in transactions. Composite foreign keys prevent milestones, invoices, deliverables, and comments from referencing another workspace's projects. Clients can approve or request changes only while a milestone awaits review and has a deliverable. The freelancer uploads revisions and may reopen an approved milestone; previous decisions remain in review history. Completion requires all milestones to be approved. Milestone editing requires an active project.

Date-only deadlines are returned as calendar-date strings, avoiding timezone shifts.

Invoice states follow draft -> sent -> paid, with void allowed from draft/sent. Paid and void invoices cannot be reopened through the API. Amounts are integer minor units with an explicit currency; totals are grouped by currency rather than mixing currencies.

## Private files

Files are capped at 4 MB and request bodies are read with an enforced byte limit. Accepted types are PDF, PNG, JPEG, WebP, and UTF-8 plain text. Signature checks reject mismatched binary types. Filenames are sanitized. File bytes live in PostgreSQL for this small deployment; no public object URLs are issued. Downloads repeat project authorization and return attachment responses with no-store and nosniff headers. Replace database byte storage with private object storage for larger workloads.

## Email

Email outbox entries are committed alongside business changes, then delivered after the transaction. Delivery states are visible to workspace managers. Pending/failed messages have bounded retries, and the notification script can run on a deployed scheduler. The owner can explicitly retry failures. Authentication emails use Better Auth's delivery callbacks. Development prints email links to the server terminal; production requires SMTP. Provider errors do not undo a successfully saved business mutation.

## Account deletion

Deletion requires the current password in the UI and an expiring email confirmation link. Workspaces where the account is the sole owner are deleted, cascading their projects and files. Shared comments and approval history in other workspaces are retained with null author/reviewer references and rendered as `Former user`. Other owners' workspaces are preserved.

## Operations and validation

Business mutations enforce same-origin checks and a database-backed per-user rate limit. Auth throttles also use database storage. Configure trusted proxy IP forwarding for the deployed host; without a resolved IP the auth library uses a shared bucket. The migration runner records applied SQL files and applies each in a transaction under an advisory lock. Better Auth manages its own schema updates.

Integration tests use separate temporary fixtures in a dedicated `_test` database. They cover the authentication lifecycle, destructive account confirmation, tenant/project isolation, invitation expiry and reuse, uploads/downloads, client revisions/approval, invoice states, access removal, and anonymized shared history. Auth functional tests disable throttling for rapid multi-login journeys and test throttling separately. Browser verification exercised registration through sending an invoice and checked desktop/mobile layout plus Montserrat. External Google OAuth and production SMTP require provider credentials and are not claimed as externally tested.
