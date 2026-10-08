"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
export function AcceptInvitation({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <div className="mt-8">
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-800">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="rounded-lg bg-[#234431] px-5 py-4 text-sm text-white"
        onClick={async () => {
          setBusy(true);
          try {
            if (/^[a-f0-9]{64}$/.test(id)) {
              const response = await fetch(`/api/project-invitations/${id}`, {
                method: "POST",
              });
              const result = await response.json();
              if (!response.ok)
                throw new Error(result.error || "Unable to accept invitation.");
              router.push(
                `/dashboard/projects/${result.projectId}?workspace=${encodeURIComponent(result.workspaceId)}`,
              );
            } else {
              const result = await authClient.organization.acceptInvitation({
                invitationId: id,
              });
              if (result.error || !result.data)
                throw new Error(result.error?.message || "Invalid invitation.");
              const active = await authClient.organization.setActive({
                organizationId: result.data.invitation.organizationId,
              });
              if (active.error) throw new Error(active.error.message);
              router.push("/dashboard");
            }
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Joining…" : "Accept invitation ↗"}
      </button>
    </div>
  );
}
