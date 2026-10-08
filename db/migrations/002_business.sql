-- Business tables are scoped to workspace IDs from Better Auth organizations.
CREATE TABLE IF NOT EXISTS project (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
 name TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','completed','archived')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(id, workspace_id)
);
CREATE TABLE IF NOT EXISTS project_client (
 project_id UUID NOT NULL, workspace_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 PRIMARY KEY(project_id,user_id), FOREIGN KEY(project_id,workspace_id) REFERENCES project(id,workspace_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS milestone (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID NOT NULL, workspace_id TEXT NOT NULL, name TEXT NOT NULL, due_date DATE,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','awaiting_approval','approved')),
 FOREIGN KEY(project_id,workspace_id) REFERENCES project(id,workspace_id) ON DELETE CASCADE, UNIQUE(id,project_id,workspace_id)
);
CREATE TABLE IF NOT EXISTS deliverable (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id TEXT NOT NULL, project_id UUID NOT NULL, milestone_id UUID NOT NULL,
 storage_key TEXT NOT NULL UNIQUE, original_name TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes BIGINT NOT NULL CHECK(size_bytes > 0),
 uploaded_by TEXT NOT NULL REFERENCES "user"(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 FOREIGN KEY(milestone_id,project_id,workspace_id) REFERENCES milestone(id,project_id,workspace_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS comment (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id TEXT NOT NULL, project_id UUID NOT NULL, author_id TEXT NOT NULL REFERENCES "user"(id),
 body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 5000), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 FOREIGN KEY(project_id,workspace_id) REFERENCES project(id,workspace_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS invoice (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id TEXT NOT NULL, project_id UUID NOT NULL, number TEXT NOT NULL,
 amount_minor BIGINT NOT NULL CHECK(amount_minor >= 0), currency CHAR(3) NOT NULL DEFAULT 'KES',
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','paid','void')), due_date DATE,
 FOREIGN KEY(project_id,workspace_id) REFERENCES project(id,workspace_id) ON DELETE CASCADE, UNIQUE(workspace_id,number)
);
CREATE TABLE IF NOT EXISTS activity (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
 actor_id TEXT REFERENCES "user"(id) ON DELETE SET NULL, action TEXT NOT NULL, metadata JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS project_workspace_idx ON project(workspace_id);
CREATE INDEX IF NOT EXISTS activity_workspace_time_idx ON activity(workspace_id,created_at DESC);
