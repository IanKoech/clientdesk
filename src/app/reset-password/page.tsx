import { AuthForm } from "@/components/auth-form";
export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return (
    <AuthForm
      mode="reset"
      token={token}
      initialError={
        error || !token
          ? "This reset link is invalid or expired. Request a new link."
          : undefined
      }
    />
  );
}
