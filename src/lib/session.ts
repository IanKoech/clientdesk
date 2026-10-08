import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !session.user.emailVerified) redirect("/login");
  return session;
}
