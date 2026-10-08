import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getWorkspaceMembership, listWorkspaces } from "@/lib/workspaces";
import { WorkspaceDashboard } from "@/components/workspace-dashboard";
export default async function Dashboard() {
  const session = await requireSession();
  const workspaces = await listWorkspaces(session.user.id);
  if (!workspaces.length) redirect("/onboarding");
  const workspaceId = session.session.activeOrganizationId || workspaces[0].id;
  const membership = await getWorkspaceMembership(session.user.id, workspaceId);
  if (!membership) redirect("/onboarding");
  return (
    <WorkspaceDashboard
      name={membership.name}
      userName={session.user.name}
      role={membership.role}
    />
  );
}
