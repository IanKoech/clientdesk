import { requireSession } from "@/lib/session";
import { listWorkspaces } from "@/lib/workspaces";
import { PortalShell } from "@/components/portal-ui";
import { AccountSettings } from "@/components/account-settings";
import { Brand } from "@/components/brand";
export default async function Settings() {
  const session = await requireSession();
  const workspaces = await listWorkspaces(session.user.id);
  const content = (
    <AccountSettings name={session.user.name} email={session.user.email} />
  );
  if (!workspaces.length)
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-12">
          <Brand />
        </div>
        {content}
      </main>
    );
  const active =
    workspaces.find((w) => w.id === session.session.activeOrganizationId) ||
    workspaces[0];
  return (
    <PortalShell
      workspaceId={active.id}
      workspaceName={active.name}
      userName={session.user.name}
      workspaces={workspaces}
      view="settings"
    >
      {content}
    </PortalShell>
  );
}
