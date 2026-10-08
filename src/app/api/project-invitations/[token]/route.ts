import { auth } from "@/lib/auth";
import {
  acceptProjectInvitation,
  portalError,
  PortalError,
} from "@/lib/portal";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user.emailVerified)
      throw new PortalError(
        401,
        "Sign in with a verified account to accept this invitation.",
      );
    const { token } = await params;
    const result = await acceptProjectInvitation(request, token, session.user);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return portalError(error);
  }
}
