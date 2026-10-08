"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Brand } from "./brand";
type Mode = "login" | "register" | "forgot" | "reset";
export function AuthForm({
  mode,
  token,
  initialError,
  googleEnabled = false,
}: {
  mode: Mode;
  token?: string;
  initialError?: string;
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError || "");
  const [message, setMessage] = useState("");
  const titles = {
    login: "Welcome back.",
    register: "Make space for good work.",
    forgot: "Let’s get you back in.",
    reset: "A fresh start.",
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "");
    const password = String(data.get("password") || "");
    try {
      const result =
        mode === "register"
          ? await authClient.signUp.email({
              name: String(data.get("name")),
              email,
              password,
              callbackURL: "/onboarding",
            })
          : mode === "login"
            ? await authClient.signIn.email({
                email,
                password,
                callbackURL: "/dashboard",
              })
            : mode === "forgot"
              ? await authClient.requestPasswordReset({
                  email,
                  redirectTo: `${window.location.origin}/reset-password`,
                })
              : await authClient.resetPassword({
                  newPassword: password,
                  token: token || "",
                });
      if (result.error)
        throw new Error(result.error.message || "Please try again.");
      if (mode === "login") {
        router.push("/dashboard");
        router.refresh();
      } else
        setMessage(
          mode === "register"
            ? "Check your email for a verification link to finish setting up your account."
            : mode === "forgot"
              ? "If an account exists for that email, a reset link has been sent."
              : "Password updated. You can now sign in.",
        );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn’t connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    const form = document.querySelector<HTMLFormElement>("#auth-form");
    const email = form ? String(new FormData(form).get("email") || "") : "";
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/onboarding",
      });
      if (result.error) throw new Error(result.error.message);
      setMessage(
        "If your account needs verification, a new link has been sent.",
      );
    } catch {
      setError("Unable to send a verification link. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-7xl px-6 md:px-14">
      <header className="flex h-24 items-center justify-between border-b border-[#dfe4d8]">
        <Brand />
        <Link href="/demo" className="text-xs text-[#7c8872]">
          Explore the demo ↗
        </Link>
      </header>
      <main className="grid min-h-[75vh] items-center gap-12 py-12 lg:grid-cols-2">
        <section className="rounded-3xl bg-[#e7ecdd] p-8 md:p-12">
          <p className="text-xs tracking-[.18em] text-[#6d8054]">
            A BETTER WAY TO WORK TOGETHER
          </p>
          <h1 className="mt-10 text-5xl leading-[1.13] font-semibold tracking-[-.05em] md:text-6xl">
            Less chasing.
            <br />
            More creating.
            <br />
            <span className="text-[#7c984f]">All together.</span>
          </h1>
          <p className="mt-7 max-w-sm text-sm leading-7 text-[#75836a]">
            A thoughtful workspace for your projects and the people you build
            them with.
          </p>
          <div className="mt-12 rounded-xl border border-[#d2dcc3] bg-[#f6f8ee] p-5">
            <p className="text-sm font-semibold">
              Your next chapter starts here.
            </p>
            <p className="mt-2 text-xs text-[#7a886c]">
              Projects. Feedback. Milestones. One clear view.
            </p>
          </div>
        </section>
        <section className="mx-auto w-full max-w-sm">
          <p className="text-[10px] font-bold tracking-[.18em] text-[#85946f]">
            WELCOME TO CLIENTDESK
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            {titles[mode]}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#7d8774]">
            {mode === "register"
              ? "Create your account, then set up your workspace."
              : mode === "login"
                ? "Sign in to your workspace and pick up where you left off."
                : "Keep your account secure with a password of at least 12 characters."}
          </p>
          {googleEnabled && (mode === "login" || mode === "register") && (
            <button
              disabled={busy}
              className="mt-7 w-full rounded-lg border border-[#dbe2d2] bg-white px-5 py-3 text-xs font-medium"
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const result = await authClient.signIn.social({
                    provider: "google",
                    callbackURL: "/dashboard",
                  });
                  if (result.error) throw new Error(result.error.message);
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Unable to sign in with Google.",
                  );
                  setBusy(false);
                }
              }}
            >
              Continue with Google
            </button>
          )}
          <form id="auth-form" className="mt-8 space-y-5" onSubmit={submit}>
            {mode === "register" && (
              <label className="block text-xs font-medium">
                Full name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  placeholder="Your name"
                  className="mt-2 block w-full rounded-lg border border-[#dbe2d2] bg-white p-3.5 text-sm"
                />
              </label>
            )}
            {mode !== "reset" && (
              <label className="block text-xs font-medium">
                Email address
                <input
                  name="email"
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="mt-2 block w-full rounded-lg border border-[#dbe2d2] bg-white p-3.5 text-sm"
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label className="block text-xs font-medium">
                Password
                <input
                  name="password"
                  required
                  type="password"
                  minLength={mode === "login" ? 1 : 12}
                  maxLength={128}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder={
                    mode === "login"
                      ? "Your password"
                      : "At least 12 characters"
                  }
                  className="mt-2 block w-full rounded-lg border border-[#dbe2d2] bg-white p-3.5 text-sm"
                />
              </label>
            )}
            {mode === "login" && (
              <div className="text-right">
                <Link href="/forgot-password" className="text-xs">
                  Forgot password?
                </Link>
              </div>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-xs leading-6 text-red-800"
              >
                {error}
              </p>
            )}
            {message && (
              <p
                role="status"
                className="rounded-lg bg-[#e7efdb] p-3 text-xs leading-6"
              >
                {message}
              </p>
            )}
            <button
              disabled={busy || (mode === "reset" && !token)}
              className="flex w-full justify-between rounded-lg bg-[#234431] px-5 py-4 text-sm text-white"
            >
              {busy
                ? "Please wait…"
                : mode === "register"
                  ? "Create account"
                  : mode === "login"
                    ? "Sign in"
                    : mode === "forgot"
                      ? "Send reset link"
                      : "Update password"}
              <span>↗</span>
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-[#849077]">
            {mode === "login" ? (
              <>
                New here?{" "}
                <Link href="/register" className="font-semibold text-[#234431]">
                  Create an account
                </Link>
              </>
            ) : (
              <Link href="/login">← Back to sign in</Link>
            )}
          </p>
          {(mode === "register" || mode === "login") && (
            <button
              disabled={busy}
              onClick={resend}
              className="mt-5 w-full text-center text-xs text-[#738363]"
            >
              Resend verification email
            </button>
          )}
          <p className="mt-8 text-center text-[10px] text-[#8a947e]">
            Secure sessions. A workspace of your own.
          </p>
        </section>
      </main>
    </div>
  );
}
