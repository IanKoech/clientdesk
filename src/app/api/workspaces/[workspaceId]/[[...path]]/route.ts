import { auth } from "@/lib/auth";
import { handlePortalRequest, portalError, PortalError } from "@/lib/portal";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; path?: string[] }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user.emailVerified)
      throw new PortalError(401, "Please sign in with a verified account.");
    const { workspaceId, path } = await params;
    const response = await handlePortalRequest(
      request,
      workspaceId,
      path || [],
      session.user,
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return portalError(error);
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
