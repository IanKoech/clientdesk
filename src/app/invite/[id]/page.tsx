import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Brand } from "@/components/brand";
import { AcceptInvitation } from "@/components/accept-invitation";
import Link from "next/link";
export default async function Invitation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <Brand />
      <h1 className="mt-16 text-3xl font-semibold tracking-tight">
        You’re invited.
      </h1>
      <p className="mt-5 text-sm leading-7 text-[#82916f]">
        Join your client workspace to keep your projects and feedback together.
        Invitations expire after 48 hours.
      </p>
      {session?.user.emailVerified ? (
        <AcceptInvitation id={id} />
      ) : (
        <div className="mt-8 space-y-4">
          <p className="text-sm">
            Sign in with the verified email address this invitation was sent to,
            then reopen this invitation link.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-[#234431] px-5 py-3 text-sm text-white"
          >
            Sign in ↗
          </Link>
          <Link href="/register" className="ml-5 text-sm">
            Create an account
          </Link>
        </div>
      )}
    </main>
  );
}
