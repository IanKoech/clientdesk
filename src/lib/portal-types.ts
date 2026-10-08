export type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: string;
  due_date: string | null;
  progress: number;
  client: string;
  awaiting: number;
};
export type InvoiceRow = {
  id: string;
  project_id: string;
  project_name?: string;
  number: string;
  amount_minor: string;
  currency: string;
  status: string;
  due_date: string | null;
};
export type Overview = {
  workspace: { id: string; name: string; role: string };
  projects: ProjectRow[];
  clients: { id: string; name: string; email: string; project_name: string }[];
  invoices: InvoiceRow[];
  activity: {
    id: string;
    action: string;
    actor: string;
    created_at: string;
    metadata: {
      projectId: string;
      name?: string;
      note?: string;
      email?: string;
      number?: string;
    };
  }[];
  invitations: {
    id: string;
    email: string;
    project_name: string;
    expires_at: string;
    accepted_at: string | null;
  }[];
  emails: {
    id: string;
    recipient: string;
    subject: string;
    status: string;
    created_at: string;
  }[];
};
export type Details = {
  project: ProjectRow;
  role: string;
  clients: { id: string; name: string; email: string }[];
  milestones: {
    id: string;
    name: string;
    status: string;
    due_date: string | null;
  }[];
  deliverables: {
    id: string;
    milestone_id: string;
    original_name: string;
    size_bytes: string;
    created_at: string;
  }[];
  comments: { id: string; body: string; author: string; created_at: string }[];
  approvals: {
    id: string;
    milestone_id: string;
    decision: string;
    note: string | null;
    reviewer: string;
    created_at: string;
  }[];
  invoices: InvoiceRow[];
};
