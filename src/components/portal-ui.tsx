"use client";
import Link from "next/link";
import {
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import { Brand } from "./brand";
import { SignOut } from "./sign-out";
import { useRouter } from "next/navigation";
export const inputClass =
  "mt-2 block w-full rounded-lg border border-[#d9e1cf] bg-white px-3.5 py-3 text-sm outline-offset-2";
export const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#234431] px-5 py-3 text-xs font-semibold text-white hover:bg-[#355940] disabled:opacity-50";
export const secondaryClass =
  "inline-flex items-center justify-center rounded-lg border border-[#d6dfca] bg-white px-4 py-2.5 text-xs font-medium text-[#4c633c] hover:bg-[#edf2e4]";
export const cardClass =
  "rounded-xl border border-[#dfe5d5] bg-white p-5 md:p-6";
export function Status({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-medium ${["approved", "completed", "paid", "sent"].includes(value) ? "bg-[#e6efd9] text-[#5c7d3f]" : value === "void" || value === "archived" ? "bg-gray-100 text-gray-500" : "bg-[#f3ecdd] text-[#94783f]"}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
export function money(amount: string, currency: string) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(
    Number(amount) / 100,
  );
}
export function displayDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "No due date";
}
export function PortalShell({
  workspaceId,
  workspaceName,
  userName,
  view,
  workspaces,
  children,
}: {
  workspaceId: string;
  workspaceName: string;
  userName: string;
  view: string;
  workspaces: { id: string; name: string }[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const navigation = [
    [LayoutDashboard, "overview", "Overview"],
    [BriefcaseBusiness, "projects", "Projects"],
    [Users, "clients", "Clients"],
    [FileText, "invoices", "Invoices"],
    [MessageSquare, "activity", "Activity"],
  ] as const;
  const url = (target: string) =>
    `/dashboard?workspace=${encodeURIComponent(workspaceId)}&view=${target}`;
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-[#e0e5d9] bg-[#fbfcf8] px-6 py-8 lg:flex lg:flex-col">
        <Brand />
        <label className="mt-10 block text-[9px] tracking-widest text-[#89987a]">
          WORKSPACE
          <select
            aria-label="Switch workspace"
            className="mt-2 w-full rounded-lg border border-[#dce3d2] bg-transparent px-2 py-3 text-xs font-semibold tracking-normal text-[#294331]"
            value={workspaceId}
            onChange={(event) =>
              router.push(
                `/dashboard?workspace=${encodeURIComponent(event.target.value)}`,
              )
            }
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <nav className="mt-8 space-y-2" aria-label="Workspace">
          {navigation.map(([Icon, target, label]) => (
            <Link
              key={target}
              href={url(target)}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-xs ${view === target ? "bg-[#e9efdf] font-semibold text-[#3d5c2d]" : "text-[#7e8c70] hover:bg-[#f0f3ea]"}`}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-xs ${view === "settings" ? "bg-[#e9efdf]" : "text-[#7e8c70]"}`}
          >
            <Settings size={15} />
            Settings
          </Link>
        </nav>
        <div className="mt-auto pt-16">
          <div className="rounded-xl bg-[#e9efdf] p-4">
            <p className="text-xs font-semibold">Room for your best work.</p>
            <p className="mt-2 text-[11px] leading-5 text-[#7b8a69]">
              A little structure. A lot more clarity.
            </p>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-24 items-center justify-between border-b border-[#e0e5d9] px-6 md:px-10">
          <div className="lg:hidden">
            <Brand />
          </div>
          <p className="hidden text-xs text-[#839175] lg:block">
            {workspaceName} <span className="px-2">/</span>
            <span className="capitalize text-[#405435]">{view}</span>
          </p>
          <div className="flex items-center gap-4">
            <span className="grid size-9 place-items-center rounded-full bg-[#e3eacb] text-xs font-bold">
              {userName.slice(0, 2).toUpperCase()}
            </span>
            <SignOut />
          </div>
        </header>
        <nav
          className="flex gap-2 overflow-x-auto border-b border-[#e0e5d9] px-5 py-3 lg:hidden"
          aria-label="Mobile workspace"
        >
          {navigation.map(([, target, label]) => (
            <Link
              className={`shrink-0 rounded-md px-3 py-2 text-[10px] ${view === target ? "bg-[#e9efdf]" : "text-[#7e8c70]"}`}
              key={target}
              href={url(target)}
            >
              {label}
            </Link>
          ))}
          <Link href="/settings" className="shrink-0 px-3 py-2 text-[10px]">
            Settings
          </Link>
        </nav>
        <div className="px-6 pt-4 lg:hidden">
          <select
            aria-label="Switch workspace"
            className="w-full rounded-lg border border-[#dce3d2] bg-white p-3 text-xs"
            value={workspaceId}
            onChange={(event) =>
              router.push(
                `/dashboard?workspace=${encodeURIComponent(event.target.value)}`,
              )
            }
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <main className="mx-auto max-w-7xl px-6 py-9 md:px-10">{children}</main>
      </div>
    </div>
  );
}
export async function portalFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    cache: "no-store",
    headers:
      options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json", ...options.headers },
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Unable to complete this request.");
  return result;
}
export function WorkspaceCreateLink() {
  return (
    <Link className="text-xs text-[#758863]" href="/onboarding">
      Create another workspace
    </Link>
  );
}
