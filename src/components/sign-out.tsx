"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
export function SignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await authClient.signOut();
            if (result.error) throw new Error("Could not sign out.");
            router.push("/login");
            router.refresh();
          } catch {
            setError("Could not sign out. Please retry.");
          } finally {
            setBusy(false);
          }
        }}
        className="text-xs text-[#7f8c71]"
      >
        {busy ? "Signing out…" : "Sign out ↗"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
