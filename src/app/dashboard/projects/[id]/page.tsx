import { portalContext } from "@/lib/portal-context";
import { PortalShell } from "@/components/portal-ui";
import { PortalProject } from "@/components/portal-project";
export default async function Project({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workspace?: string }>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const context = await portalContext(search.workspace);
  return (
    <PortalShell
      workspaceId={context.workspaceId}
      workspaceName={context.membership.name}
      userName={context.session.user.name}
      workspaces={context.workspaces}
      view="projects"
    >
      <PortalProject
        key={id + context.workspaceId}
        workspaceId={context.workspaceId}
        projectId={id}
      />
    </PortalShell>
  );
}
