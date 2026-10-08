import { portalContext } from "@/lib/portal-context";
import { PortalShell } from "@/components/portal-ui";
import { PortalOverview } from "@/components/portal-overview";
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string; view?: string }>;
}) {
  const params = await searchParams;
  const context = await portalContext(params.workspace);
  const view = [
    "overview",
    "projects",
    "clients",
    "invoices",
    "activity",
  ].includes(params.view || "")
    ? params.view!
    : "overview";
  return (
    <PortalShell
      workspaceId={context.workspaceId}
      workspaceName={context.membership.name}
      userName={context.session.user.name}
      workspaces={context.workspaces}
      view={view}
    >
      <PortalOverview
        key={context.workspaceId + view}
        workspaceId={context.workspaceId}
        userName={context.session.user.name}
        role={context.membership.role}
        view={view}
      />
    </PortalShell>
  );
}
