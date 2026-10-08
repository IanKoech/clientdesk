import { notFound, redirect } from "next/navigation";
import { requireSession } from "./session";
import { listWorkspaces, getWorkspaceMembership } from "./workspaces";
export async function portalContext(selected?: string) {
  const session = await requireSession();
  const workspaces = await listWorkspaces(session.user.id);
  if (!workspaces.length) redirect("/onboarding");
  const active = workspaces.find(
    (w) => w.id === session.session.activeOrganizationId,
  );
  const id = selected || active?.id || workspaces[0].id;
  const membership = await getWorkspaceMembership(session.user.id, id);
  if (!membership) notFound();
  return { session, workspaces, membership, workspaceId: id };
}
