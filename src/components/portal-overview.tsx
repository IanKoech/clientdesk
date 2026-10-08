"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import type { Overview } from "@/lib/portal-types";
import {
  buttonClass,
  cardClass,
  displayDate,
  inputClass,
  money,
  portalFetch,
  secondaryClass,
  Status,
  WorkspaceCreateLink,
} from "./portal-ui";
export function PortalOverview({
  workspaceId,
  userName,
  role,
  view,
}: {
  workspaceId: string;
  userName: string;
  role: string;
  view: string;
}) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const manager = role === "owner" || role === "admin";
  const base = `/api/workspaces/${encodeURIComponent(workspaceId)}`;
  const refresh = useCallback(async () => {
    const next = await portalFetch<Overview>(base);
    setData(next);
  }, [base]);
  useEffect(() => {
    let active = true;
    portalFetch<Overview>(base)
      .then((value) => {
        if (active) {
          setData(value);
          setError("");
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [base]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError("");
    try {
      await portalFetch(base + "/projects", {
        method: "POST",
        body: JSON.stringify({ ...fields, due_date: fields.due_date || null }),
      });
      form.reset();
      setCreating(false);
      setMessage(
        "Project created. Open it to add milestones and invite your client.",
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const invoices = data?.invoices || [];
  const totals = invoices
    .filter((i) => i.status === "sent")
    .reduce<Record<string, number>>(
      (sum, i) => ({
        ...sum,
        [i.currency]: (sum[i.currency] || 0) + Number(i.amount_minor),
      }),
      {},
    );
  const projects = data?.projects || [];
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[10px] font-semibold tracking-[.18em] text-[#89987a]">
            YOUR WORK, ALL TOGETHER
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            {view === "overview"
              ? `Welcome back, ${userName.split(" ")[0]}.`
              : view === "projects"
                ? "Your projects."
                : view === "clients"
                  ? "Your connections."
                  : view === "invoices"
                    ? "Invoices, with clarity."
                    : "A little progress, every day."}
          </h1>
          <p className="mt-3 text-xs leading-6 text-[#7d8d6c]">
            {manager
              ? "Keep your projects and client conversations moving."
              : "Review the work shared with you and keep feedback in one place."}
          </p>
        </div>
        {manager && ["overview", "projects"].includes(view) && (
          <button
            className={buttonClass}
            onClick={() => setCreating(!creating)}
          >
            <Plus size={15} />
            New project
          </button>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="my-5 rounded-lg bg-red-50 p-4 text-xs text-red-800"
        >
          {error}{" "}
          <button
            onClick={() => {
              setError("");
              refresh().catch((err) => setError(err.message));
            }}
            className="ml-3 underline"
          >
            Retry
          </button>
        </p>
      )}
      {message && (
        <p role="status" className="my-5 rounded-lg bg-[#e8efdc] p-4 text-xs">
          {message}
        </p>
      )}
      {creating && (
        <section className={cardClass + " mt-7"}>
          <h2 className="text-lg font-semibold">Start a new project</h2>
          <form onSubmit={create} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-xs">
              Project name
              <input
                className={inputClass}
                name="name"
                placeholder="Brand identity for Savanna"
                minLength={1}
                maxLength={200}
                required
              />
            </label>
            <label className="text-xs">
              Category
              <input
                className={inputClass}
                name="category"
                defaultValue="General"
                maxLength={200}
                required
              />
            </label>
            <label className="text-xs">
              Due date
              <input className={inputClass} name="due_date" type="date" />
            </label>
            <label className="text-xs">
              Project brief
              <textarea
                className={inputClass}
                name="description"
                maxLength={5000}
                rows={2}
                placeholder="What are you building together?"
              />
            </label>
            <div className="flex gap-3 md:col-span-2">
              <button disabled={busy} className={buttonClass}>
                {busy ? "Creating…" : "Create project ↗"}
              </button>
              <button
                type="button"
                className={secondaryClass}
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
      {!data && !error && (
        <p className="py-16 text-sm text-[#839175]">Loading your workspace…</p>
      )}
      {data && (
        <>
          {view === "overview" && (
            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [
                  "Active projects",
                  projects.filter((p) => p.status === "active").length,
                ],
                [
                  "Awaiting approval",
                  projects.reduce((sum, p) => sum + p.awaiting, 0),
                ],
                [
                  "Outstanding invoices",
                  Object.entries(totals)
                    .map(([currency, total]) => money(String(total), currency))
                    .join(" · ") || "None",
                ],
                [
                  "Completed projects",
                  projects.filter((p) => p.status === "completed").length,
                ],
              ].map(([label, value]) => (
                <article className={cardClass} key={label}>
                  <p className="text-[11px] text-[#839175]">{label}</p>
                  <p className="mt-5 text-2xl font-medium tracking-tight">
                    {value}
                  </p>
                </article>
              ))}
            </section>
          )}
          {["overview", "projects"].includes(view) && (
            <section className="mt-9">
              <div className="mb-5 flex justify-between">
                <h2 className="text-lg font-semibold">
                  Projects{" "}
                  <span className="ml-2 text-xs font-normal text-[#8c997c]">
                    ({projects.length})
                  </span>
                </h2>
                <WorkspaceCreateLink />
              </div>
              {!projects.length ? (
                <div className="rounded-xl border border-dashed border-[#cbd8bc] bg-[#edf1e5] px-6 py-16 text-center">
                  <ArrowUpRight className="mx-auto text-[#8a9e70]" />
                  <h3 className="mt-5 text-lg font-medium">A fresh canvas.</h3>
                  <p className="mt-3 text-xs leading-7 text-[#7f916c]">
                    {manager
                      ? "Create your first project, add milestones, and invite a client."
                      : "The projects shared with you will appear here. Ask your freelancer for a project invitation."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-2">
                  {projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/dashboard/projects/${p.id}?workspace=${encodeURIComponent(workspaceId)}`}
                      className={
                        cardClass + " block transition hover:border-[#91aa72]"
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold">{p.name}</h3>
                          <p className="mt-2 text-[11px] text-[#89977b]">
                            {p.client} · {p.category}
                          </p>
                        </div>
                        <Status value={p.status} />
                      </div>
                      <div className="mt-7 flex items-center gap-4">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#edf1e7]">
                          <div
                            className="h-full bg-[#869f5f]"
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#839175]">
                          {p.progress}%
                        </span>
                      </div>
                      <div className="mt-5 flex justify-between border-t border-[#edf0e6] pt-4 text-[10px] text-[#839175]">
                        <span>{p.awaiting} awaiting approval</span>
                        <span>{displayDate(p.due_date)} ↗</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}
          {view === "clients" && (
            <div className="mt-8 space-y-6">
              <section className={cardClass}>
                <h2 className="mb-5 text-lg font-semibold">Project clients</h2>
                {data.clients.length ? (
                  data.clients.map((client, index) => (
                    <div
                      key={client.id + index}
                      className="flex flex-wrap justify-between gap-3 border-t border-[#e7eddd] py-4"
                    >
                      <div>
                        <p className="text-sm font-medium">{client.name}</p>
                        <p className="mt-1 break-all text-[11px] text-[#89987a]">
                          {client.email}
                        </p>
                      </div>
                      <span className="text-xs text-[#758865]">
                        {client.project_name}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs leading-7 text-[#839175]">
                    No clients have joined yet. Open a project to invite a
                    client.
                  </p>
                )}
              </section>
              {manager && (
                <section className={cardClass}>
                  <h2 className="mb-5 text-lg font-semibold">Invitations</h2>
                  {data.invitations.length ? (
                    data.invitations.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex flex-wrap justify-between gap-3 border-t border-[#e7eddd] py-4"
                      >
                        <div>
                          <p className="break-all text-xs">{invite.email}</p>
                          <p className="mt-2 text-[10px] text-[#839175]">
                            {invite.project_name} · Expires{" "}
                            {displayDate(invite.expires_at)}
                          </p>
                        </div>
                        <Status
                          value={
                            invite.accepted_at
                              ? "accepted"
                              : new Date(invite.expires_at) < new Date()
                                ? "expired"
                                : "pending"
                          }
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#839175]">
                      Your project invitations will appear here.
                    </p>
                  )}
                </section>
              )}
            </div>
          )}
          {view === "invoices" && (
            <section className={cardClass + " mt-8"}>
              <h2 className="mb-5 text-lg font-semibold">Your invoices</h2>
              {invoices.length ? (
                invoices.map((invoice) => (
                  <Link
                    href={`/dashboard/projects/${invoice.project_id}?workspace=${encodeURIComponent(workspaceId)}`}
                    key={invoice.id}
                    className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e7eddd] py-5"
                  >
                    <div>
                      <p className="text-sm font-medium">{invoice.number}</p>
                      <p className="mt-2 text-[11px] text-[#839175]">
                        {invoice.project_name} · {displayDate(invoice.due_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-5">
                      <span className="text-xs font-semibold">
                        {money(invoice.amount_minor, invoice.currency)}
                      </span>
                      <Status value={invoice.status} />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-xs leading-7 text-[#839175]">
                  {manager
                    ? "Create an invoice inside a project to get started."
                    : "Invoices will appear once your freelancer sends them."}
                </p>
              )}
            </section>
          )}
          {view === "activity" && (
            <div className="mt-8 space-y-6">
              <section className={cardClass}>
                <h2 className="mb-4 text-lg font-semibold">Activity history</h2>
                {data.activity.length ? (
                  data.activity.map((item) => (
                    <div
                      key={item.id}
                      className="border-t border-[#e7eddd] py-4"
                    >
                      <p className="text-xs font-medium">
                        {item.action}
                        {item.metadata.name ? ` · ${item.metadata.name}` : ""}
                        {item.metadata.number
                          ? ` · ${item.metadata.number}`
                          : ""}
                      </p>
                      <p className="mt-2 text-[10px] text-[#839175]">
                        {item.actor || "Former user"} ·{" "}
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                      {item.metadata.note && (
                        <p className="mt-3 text-xs leading-6">
                          {item.metadata.note}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#839175]">
                    Project activity will appear here.
                  </p>
                )}
              </section>
              {manager && (
                <section className={cardClass}>
                  <div className="mb-5 flex flex-wrap justify-between gap-4">
                    <h2 className="text-lg font-semibold">
                      Email notifications
                    </h2>
                    <button
                      disabled={busy}
                      className={secondaryClass}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await portalFetch(base + "/notifications/retry", {
                            method: "POST",
                            body: "{}",
                          });
                          await refresh();
                          setMessage("Pending notifications retried.");
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Please retry.",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Retry pending emails
                    </button>
                  </div>
                  {data.emails.length ? (
                    data.emails.map((mail) => (
                      <div
                        key={mail.id}
                        className="flex flex-wrap justify-between gap-3 border-t border-[#e7eddd] py-4"
                      >
                        <div>
                          <p className="text-xs">{mail.subject}</p>
                          <p className="mt-2 break-all text-[10px] text-[#839175]">
                            {mail.recipient}
                          </p>
                        </div>
                        <Status value={mail.status} />
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#839175]">
                      Invitations and project updates will create notifications
                      here.
                    </p>
                  )}
                </section>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
