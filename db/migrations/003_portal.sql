ALTER TABLE project ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'General';
ALTER TABLE project ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE deliverable ADD COLUMN IF NOT EXISTS content BYTEA;
CREATE TABLE IF NOT EXISTS project_invitation (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), token_hash TEXT NOT NULL UNIQUE, workspace_id TEXT NOT NULL, project_id UUID NOT NULL,
 email TEXT NOT NULL, invited_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL, accepted_at TIMESTAMPTZ,
 FOREIGN KEY(project_id,workspace_id) REFERENCES project(id,workspace_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS approval (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id TEXT NOT NULL, project_id UUID NOT NULL, milestone_id UUID NOT NULL,
 user_id TEXT NOT NULL REFERENCES "user"(id), decision TEXT NOT NULL CHECK(decision IN ('approved','changes_requested')), note TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 FOREIGN KEY(milestone_id,project_id,workspace_id) REFERENCES milestone(id,project_id,workspace_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS email_outbox (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
 recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed')),
 attempts INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), sent_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS portal_rate_limit (
 user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE, window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(), requests INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS project_client_user_idx ON project_client(user_id,workspace_id);
CREATE INDEX IF NOT EXISTS invitation_project_idx ON project_invitation(project_id,email);

ALTER TABLE milestone ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE invoice ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS member_unique_workspace_user ON member("organizationId","userId");
