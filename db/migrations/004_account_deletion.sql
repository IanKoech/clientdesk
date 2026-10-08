ALTER TABLE comment ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE comment DROP CONSTRAINT IF EXISTS comment_author_id_fkey;
ALTER TABLE comment ADD CONSTRAINT comment_author_id_fkey FOREIGN KEY(author_id) REFERENCES "user"(id) ON DELETE SET NULL;
ALTER TABLE deliverable ALTER COLUMN uploaded_by DROP NOT NULL;
ALTER TABLE deliverable DROP CONSTRAINT IF EXISTS deliverable_uploaded_by_fkey;
ALTER TABLE deliverable ADD CONSTRAINT deliverable_uploaded_by_fkey FOREIGN KEY(uploaded_by) REFERENCES "user"(id) ON DELETE SET NULL;
ALTER TABLE approval ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE approval DROP CONSTRAINT IF EXISTS approval_user_id_fkey;
ALTER TABLE approval ADD CONSTRAINT approval_user_id_fkey FOREIGN KEY(user_id) REFERENCES "user"(id) ON DELETE SET NULL;
