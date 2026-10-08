import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
  Check,
  Clock,
  Plus,
} from "lucide-react";
import { Brand } from "./brand";
import { SignOut } from "./sign-out";
export type Project = {
  id: string;
  name: string;
  client: string;
  category: string;
  progress: number;
  status: string;
  due: string;
};
export function WorkspaceDashboard({
  name,
  userName,
  role,
  projects = [],
  demo = false,
}: {
  name: string;
  userName: string;
  role: string;
  projects?: Project[];
  demo?: boolean;
}) {
  const nav = [
    [LayoutDashboard, "Overview"],
    [BriefcaseBusiness, "Projects"],
    [Users, "Clients"],
    [FileText, "Invoices"],
    [MessageSquare, "Activity"],
    [Settings, "Settings"],
  ] as const;
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-[#e0e5d9] bg-[#fbfcf8] p-7 lg:flex lg:flex-col">
        <Brand />
        <div className="mt-10 rounded-lg border border-[#dce3d2] p-3">
          <p className="text-[9px] tracking-widest text-[#89987a]">WORKSPACE</p>
          <p className="mt-2 truncate text-sm font-semibold">{name}</p>
          <p className="mt-1 text-[10px] text-[#89987a]">
            {role === "owner" ? "Freelancer" : "Client"} workspace
          </p>
        </div>
        <nav aria-label="Workspace" className="mt-8 space-y-2">
          {nav.map(([Icon, label], i) => (
            <div
              key={label}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-xs ${i === 0 ? "bg-[#e9efdf] font-semibold text-[#3d5c2d]" : "text-[#869279]"}`}
            >
              <Icon size={15} />
              {label}
              {i !== 0 && <span className="ml-auto text-[8px]">Soon</span>}
            </div>
          ))}
        </nav>
        <div className="mt-auto pt-20">
          <div className="rounded-xl bg-[#e9efdf] p-4">
            <p className="text-xs font-semibold">Room for your best work.</p>
            <p className="mt-2 text-[11px] leading-5 text-[#7b8a69]">
              A little structure. A lot more clarity.
            </p>
          </div>
          <p className="mt-5 text-[10px] text-[#89977a]">
            ClientDesk / Foundation release
          </p>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-24 items-center justify-between border-b border-[#e0e5d9] px-6 md:px-10">
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="hidden items-center gap-2 text-xs text-[#8a957f] lg:flex">
            Workspace <span>/</span>
            <span className="text-[#405435]">Overview</span>
          </div>
          <div className="flex items-center gap-5">
            <Bell size={17} className="text-[#8a957f]" />
            <span className="grid size-9 place-items-center rounded-full bg-[#e3eacb] text-xs font-bold">
              {userName.slice(0, 2).toUpperCase()}
            </span>
            {demo ? (
              <Link href="/register" className="text-xs">
                Get started ↗
              </Link>
            ) : (
              <SignOut />
            )}
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
          {demo && (
            <div className="mb-8 rounded-lg border border-[#d8e2c8] bg-[#edf2e4] px-4 py-3 text-xs leading-5 text-[#6b7e54]">
              Demo workspace · Sample data, no changes are saved.{" "}
              <Link href="/register" className="font-semibold underline">
                Create your own workspace ↗
              </Link>
            </div>
          )}
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-bold tracking-[.18em] text-[#89987a]">
                A LITTLE CLARITY FOR YOUR DAY
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] md:text-4xl">
                Welcome back, {userName.split(" ")[0]}
                <span className="text-[#8ba567]">.</span>
              </h1>
              <p className="mt-3 text-sm text-[#88937c]">
                {projects.length
                  ? "Here’s where your work stands. Let’s keep things moving."
                  : "Your workspace is ready. Good work starts here."}
              </p>
            </div>
            <span className="flex items-center gap-2 rounded-lg border border-[#d8e1cc] px-4 py-3 text-xs text-[#7c8b69]">
              <Plus size={14} /> Project creation coming next
            </span>
          </div>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [
                BriefcaseBusiness,
                "Active projects",
                projects.length,
                "Your work in motion",
              ],
              [
                Clock,
                "Awaiting approval",
                demo ? 2 : 0,
                "Ready for client feedback",
              ],
              [
                FileText,
                "Outstanding invoices",
                demo ? "KES 84,000" : "KES 0",
                "Payment tracking coming next",
              ],
              [
                Check,
                "Completed projects",
                demo ? 12 : 0,
                "A little progress, every day",
              ],
            ].map(([Icon, label, value, note]) => {
              const MetricIcon = Icon as typeof Check;
              return (
                <article
                  key={String(label)}
                  className="rounded-xl border border-[#e0e5d8] bg-white p-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#78886a]">{String(label)}</p>
                    <MetricIcon size={15} className="text-[#9daa8b]" />
                  </div>
                  <p className="mt-6 text-3xl font-medium tracking-tight">
                    {String(value)}
                  </p>
                  <p className="mt-3 text-[10px] text-[#8e9b7e]">
                    {String(note)}
                  </p>
                </article>
              );
            })}
          </section>
          <div className="mt-9 grid gap-6 xl:grid-cols-[1fr_280px]">
            <section>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">
                  Your projects{" "}
                  <span className="ml-2 text-xs font-normal text-[#94a083]">
                    ({projects.length})
                  </span>
                </h2>
                <span className="text-[10px] text-[#8d9a7d]">
                  A clear view of what’s next
                </span>
              </div>
              {projects.length ? (
                <div className="space-y-4">
                  {projects.map((project, index) => (
                    <article
                      key={project.id}
                      className="rounded-xl border border-[#dfe5d5] bg-white p-5"
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm font-semibold ${index % 2 ? "bg-[#efe6db] text-[#9c7f57]" : "bg-[#e5ecda] text-[#6c8650]"}`}
                        >
                          {project.name.slice(0, 1)}
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold">
                            {project.name}
                          </h3>
                          <p className="mt-1 text-[11px] text-[#8d9a7f]">
                            {project.client} · {project.category}
                          </p>
                        </div>
                        <span className="ml-auto rounded-full bg-[#edf2e5] px-3 py-1 text-[9px] text-[#73885b]">
                          {project.status}
                        </span>
                      </div>
                      <div className="mt-6 flex items-center gap-4">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#edf0e8]">
                          <div
                            className="h-full rounded-full bg-[#879f61]"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#8b997b]">
                          {project.progress}%
                        </span>
                      </div>
                      <div className="mt-4 flex justify-between border-t border-[#eef1e8] pt-3 text-[10px] text-[#8b987c]">
                        <span>Milestones & deliverables</span>
                        <span>{project.due}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#ccd8be] bg-[#edf1e5] px-7 py-16 text-center">
                  <BriefcaseBusiness
                    size={28}
                    className="mx-auto text-[#8c9f73]"
                  />
                  <h3 className="mt-5 text-lg font-medium">A fresh canvas.</h3>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[#82916e]">
                    Project creation, client invitations, and milestone tracking
                    are the next steps in this foundation release.
                  </p>
                </div>
              )}
            </section>
            <aside>
              <h2 className="mb-5 text-lg font-semibold tracking-tight">
                At a glance
              </h2>
              <div className="rounded-xl border border-[#dfe5d5] bg-white p-5">
                <p className="text-[10px] tracking-wider text-[#8d9a7d]">
                  WORKSPACE STATUS
                </p>
                <p className="mt-4 flex items-center gap-2 text-xs">
                  <span className="size-2 rounded-full bg-[#86a365]" />{" "}
                  {demo ? "Demo mode" : "Account verified"}
                </p>
                <p className="mt-4 text-xs leading-6 text-[#879577]">
                  {demo
                    ? "Explore how your workspace will look as projects grow."
                    : "Your account and workspace are set up. You’re ready for the next release."}
                </p>
              </div>
              <div className="mt-4 rounded-xl bg-[#e5ebd9] p-6">
                <ArrowUpRight size={24} className="text-[#829862]" />
                <h3 className="mt-5 text-xl leading-7 font-medium tracking-tight">
                  Clear projects.
                  <br />
                  Happy clients.
                </h3>
                <p className="mt-4 text-xs leading-6 text-[#81936a]">
                  Keep everyone on the same page, from the first idea to the
                  final handover.
                </p>
              </div>
            </aside>
          </div>
          <footer className="mt-12 border-t border-[#e0e5d8] pt-6 text-[10px] text-[#95a184]">
            A calmer home for your work.
          </footer>
        </main>
      </div>
    </div>
  );
}
