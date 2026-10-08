import { AuthForm } from "@/components/auth-form";
export default function Register() {
  return (
    <AuthForm
      googleEnabled={Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      )}
      mode="register"
    />
  );
}
