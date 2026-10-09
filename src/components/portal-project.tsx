"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Download, Plus, Send, Check } from "lucide-react";
import type { Details, InvoiceRow } from "@/lib/portal-types";
import {
  buttonClass,
  cardClass,
  displayDate,
  inputClass,
  money,
  portalFetch,
  secondaryClass,
  Status,
} from "./portal-ui";
export function PortalProject({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const base = `/api/workspaces/${encodeURIComponent(workspaceId)}/projects/${projectId}`;
  const [data, setData] = useState<Details | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const result = await portalFetch<Details>(base);
    setData(result);
  }, [base]);
  useEffect(() => {
    let active = true;
    portalFetch<Details>(base)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [base]);
  const manager = data?.role === "owner" || data?.role === "admin";
  async function action(
    path: string,
    method: string,
    body: unknown,
    success: string,
    form?: HTMLFormElement,
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await portalFetch(base + path, {
        method,
        body: body instanceof FormData ? body : JSON.stringify(body),
      });
      form?.reset();
      setMessage(success);
      setRevision(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  function submit(
    event: FormEvent<HTMLFormElement>,
    path: string,
    success: string,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    return action(
      path,
      "POST",
      {
        ...fields,
        ...("due_date" in fields ? { due_date: fields.due_date || null } : {}),
      },
      success,
      form,
    );
  }
  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    const amount = String(fields.amount).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      setError("Enter a positive amount with up to two decimal places.");
      return;
    }
    const [whole, fraction = ""] = amount.split(".");
    const minor = Number(
      BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")),
    );
    if (!Number.isSafeInteger(minor) || minor < 1 || minor > 100000000000) {
      setError("That invoice amount is outside the supported range.");
      return;
    }
    await action(
      "/invoices",
      "POST",
      {
        number: fields.number,
        amount_minor: minor,
        currency: fields.currency,
        due_date: fields.due_date || null,
      },
      "Draft invoice created.",
      form,
    );
  }
  function invoiceButtons(invoice: InvoiceRow) {
    return (
      manager && (
        <div className="mt-4 flex flex-wrap gap-2">
          {invoice.status === "draft" && (
            <button
              disabled={busy}
              className={secondaryClass}
              onClick={() =>
                action(
                  "/invoices/" + invoice.id,
                  "PATCH",
                  { status: "sent" },
                  "Invoice sent to the client.",
                )
              }
            >
              Send invoice
            </button>
          )}
          {invoice.status === "sent" && (
            <button
              disabled={busy}
              className={secondaryClass}
              onClick={() =>
                action(
                  "/invoices/" + invoice.id,
                  "PATCH",
                  { status: "paid" },
                  "Invoice marked as paid.",
                )
              }
            >
              Mark paid
            </button>
          )}
          {["draft", "sent"].includes(invoice.status) && (
            <button
              disabled={busy}
              className={secondaryClass}
              onClick={() =>
                action(
                  "/invoices/" + invoice.id,
                  "PATCH",
                  { status: "void" },
                  "Invoice voided.",
                )
              }
            >
              Void
            </button>
          )}
        </div>
      )
    );
  }
  return (
    <>
      <Link
        href={`/dashboard?workspace=${encodeURIComponent(workspaceId)}&view=projects`}
        className="text-xs text-[#7d8c6d]"
      >
        ← All projects
      </Link>
      {error && (
        <p
          role="alert"
          className="my-5 rounded-lg bg-red-50 p-4 text-xs leading-6 text-red-800"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="my-5 rounded-lg bg-[#e7efda] p-4 text-xs leading-6"
        >
          {message}
        </p>
      )}
      {!data && !error && (
        <p className="py-16 text-sm text-[#839175]">Loading your project…</p>
      )}
      {data && (
        <>
          <div className="mt-7 flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-[10px] tracking-[.18em] text-[#89987a]">
                {data.project.category.toUpperCase()}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                {data.project.name}
              </h1>
              <p className="mt-4 max-w-2xl whitespace-pre-wrap text-xs leading-7 text-[#7f8f70]">
                {data.project.description || "Your project, all in one place."}
              </p>
              <p className="mt-3 text-[10px] text-[#89987a]">
                {displayDate(data.project.due_date)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-4">
              <Status value={data.project.status} />
              {manager && (
                <select
                  aria-label="Project status"
                  disabled={busy}
                  className="rounded-lg border border-[#d8e1cb] bg-white p-2 text-xs"
                  value={data.project.status}
                  onChange={(event) =>
                    action(
                      "",
                      "PATCH",
                      { status: event.target.value },
                      "Project status updated.",
                    )
                  }
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              )}
            </div>
          </div>
          <div className="mt-9 grid items-start gap-6 xl:grid-cols-[1fr_300px]">
            <div className="min-w-0 space-y-6">
              <section className={cardClass}>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    Milestones & deliverables
                  </h2>
                  <span className="text-xs text-[#8c997c]">
                    {
                      data.milestones.filter((m) => m.status === "approved")
                        .length
                    }
                    /{data.milestones.length} approved
                  </span>
                </div>
                {!data.milestones.length && (
                  <p className="mb-5 text-xs leading-7 text-[#89977b]">
                    {manager
                      ? "Break the work into clear milestones. Add your first one below."
                      : "Your freelancer will add milestones here."}
                  </p>
                )}
                {data.milestones.map((milestone) => (
                  <article
                    key={milestone.id}
                    className="border-t border-[#e3ead8] py-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">
                          {milestone.name}
                        </h3>
                        <p className="mt-2 text-[10px] text-[#89987a]">
                          {displayDate(milestone.due_date)}
                        </p>
                      </div>
                      <Status value={milestone.status} />
                    </div>
                    <div className="mt-4 space-y-2">
                      {data.deliverables
                        .filter((file) => file.milestone_id === milestone.id)
                        .map((file) => (
                          <a
                            key={file.id}
                            href={base + "/deliverables/" + file.id}
                            className="flex items-center justify-between gap-3 rounded-lg bg-[#f3f6ed] p-3 text-xs"
                          >
                            <span className="min-w-0 break-all">
                              {file.original_name}
                              <span className="ml-2 text-[10px] text-[#8a9979]">
                                {Math.ceil(Number(file.size_bytes) / 1024)} KB
                              </span>
                            </span>
                            <Download
                              size={14}
                              className="shrink-0 text-[#799162]"
                            />
                          </a>
                        ))}
                    </div>
                    {manager ? (
                      <div className="mt-4 space-y-3">
                        {milestone.status !== "awaiting_approval" && (
                          <button
                            disabled={busy}
                            className={secondaryClass}
                            onClick={() =>
                              action(
                                "/milestones/" + milestone.id,
                                "PATCH",
                                { status: "in_progress" },
                                milestone.status === "approved"
                                  ? "New revision started. Upload updated work for client review."
                                  : "Milestone started.",
                              )
                            }
                          >
                            {milestone.status === "approved"
                              ? "Start a new revision"
                              : "Mark in progress"}
                          </button>
                        )}
                        {milestone.status !== "approved" && (
                          <form
                            className="rounded-lg border border-dashed border-[#cbd8bb] p-4"
                            onSubmit={(event) => {
                              event.preventDefault();
                              const form = event.currentTarget;
                              action(
                                "/milestones/" + milestone.id + "/deliverables",
                                "POST",
                                new FormData(form),
                                "Deliverable submitted for client approval.",
                                form,
                              );
                            }}
                          >
                            <label className="block text-[11px] font-medium">
                              Upload work for review
                              <input
                                className="mt-3 block max-w-full text-[10px] file:mr-3 file:rounded-md file:border-0 file:bg-[#e8eedc] file:px-3 file:py-2 file:text-[#5b7440]"
                                type="file"
                                name="file"
                                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                                required
                              />
                            </label>
                            <p className="mt-2 text-[9px] text-[#89987a]">
                              PDF, images, or plain text · Up to 4 MB
                            </p>
                            <button
                              disabled={busy}
                              className={secondaryClass + " mt-4"}
                            >
                              Upload & submit ↗
                            </button>
                          </form>
                        )}
                      </div>
                    ) : (
                      milestone.status === "awaiting_approval" && (
                        <div className="mt-4">
                          <div className="flex flex-wrap gap-3">
                            <button
                              disabled={busy}
                              className={buttonClass}
                              onClick={() =>
                                action(
                                  "/milestones/" + milestone.id,
                                  "PATCH",
                                  { status: "approved" },
                                  "Milestone approved. Your freelancer has been notified.",
                                )
                              }
                            >
                              <Check size={14} />
                              Approve milestone
                            </button>
                            <button
                              disabled={busy}
                              className={secondaryClass}
                              onClick={() =>
                                setRevision(
                                  revision === milestone.id
                                    ? null
                                    : milestone.id,
                                )
                              }
                            >
                              Request changes
                            </button>
                          </div>
                          {revision === milestone.id && (
                            <form
                              className="mt-4"
                              onSubmit={(event) => {
                                event.preventDefault();
                                action(
                                  "/milestones/" + milestone.id,
                                  "PATCH",
                                  {
                                    status: "changes_requested",
                                    note: String(
                                      new FormData(event.currentTarget).get(
                                        "note",
                                      ),
                                    ),
                                  },
                                  "Changes requested. Your feedback has been saved.",
                                );
                              }}
                            >
                              <label className="block text-xs">
                                What needs to change?
                                <textarea
                                  className={inputClass}
                                  name="note"
                                  rows={3}
                                  maxLength={2000}
                                  required
                                />
                              </label>
                              <button
                                disabled={busy}
                                className={buttonClass + " mt-3"}
                              >
                                Send feedback
                              </button>
                            </form>
                          )}
                        </div>
                      )
                    )}
                    {data.approvals
                      .filter((a) => a.milestone_id === milestone.id)
                      .map((approval) => (
                        <div
                          key={approval.id}
                          className="mt-4 rounded-lg border border-[#e4ebd9] p-3"
                        >
                          <p className="text-[10px] text-[#7c8c68]">
                            {approval.reviewer} ·{" "}
                            {approval.decision.replaceAll("_", " ")} ·{" "}
                            {displayDate(approval.created_at)}
                          </p>
                          {approval.note && (
                            <p className="mt-2 whitespace-pre-wrap text-xs leading-6">
                              {approval.note}
                            </p>
                          )}
                        </div>
                      ))}
                  </article>
                ))}
                {manager && (
                  <form
                    onSubmit={(event) =>
                      submit(event, "/milestones", "Milestone added.")
                    }
                    className="mt-3 rounded-lg bg-[#f3f6ed] p-4"
                  >
                    <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold">
                      <Plus size={14} />
                      Add a milestone
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-[11px]">
                        Milestone name
                        <input
                          className={inputClass}
                          name="name"
                          placeholder="Discovery & direction"
                          maxLength={200}
                          required
                        />
                      </label>
                      <label className="text-[11px]">
                        Due date
                        <input
                          className={inputClass}
                          name="due_date"
                          type="date"
                        />
                      </label>
                    </div>
                    <button
                      disabled={busy}
                      className={secondaryClass + " mt-4"}
                    >
                      Add milestone
                    </button>
                  </form>
                )}
              </section>
              <section className={cardClass}>
                <h2 className="text-lg font-semibold">Conversation</h2>
                <div className="my-5 space-y-4">
                  {data.comments.length ? (
                    data.comments.map((comment) => (
                      <article
                        className="rounded-lg bg-[#f4f6ef] p-4"
                        key={comment.id}
                      >
                        <div className="flex flex-wrap justify-between gap-2 text-[10px] text-[#80916c]">
                          <strong>{comment.author}</strong>
                          <span>
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-7">
                          {comment.body}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p className="text-xs leading-7 text-[#89987a]">
                      Keep questions, feedback, and decisions together.
                    </p>
                  )}
                </div>
                <form
                  onSubmit={(event) =>
                    submit(event, "/comments", "Comment added.")
                  }
                >
                  <label className="block text-xs">
                    Add a comment
                    <textarea
                      className={inputClass}
                      name="body"
                      required
                      maxLength={5000}
                      rows={3}
                      placeholder="What would you like to share?"
                    />
                  </label>
                  <button disabled={busy} className={buttonClass + " mt-4"}>
                    <Send size={13} />
                    Post comment
                  </button>
                </form>
              </section>
              <section className={cardClass}>
                <h2 className="text-lg font-semibold">Invoices</h2>
                <p className="mt-2 text-[10px] leading-6 text-[#89987a]">
                  Payment status is tracked manually. ClientDesk does not
                  process payments.
                </p>
                <div className="my-5 space-y-4">
                  {data.invoices.map((invoice) => (
                    <article
                      className="rounded-lg border border-[#dfe7d2] p-4"
                      key={invoice.id}
                    >
                      <div className="flex flex-wrap justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold">
                            {invoice.number}
                          </h3>
                          <p className="mt-2 text-[10px] text-[#89987a]">
                            {displayDate(invoice.due_date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="mb-3 text-sm font-semibold">
                            {money(invoice.amount_minor, invoice.currency)}
                          </p>
                          <Status value={invoice.status} />
                        </div>
                      </div>
                      {invoiceButtons(invoice)}
                      <button
                        className="mt-4 text-[10px] text-[#6b8350] underline"
                        onClick={() => {
                          const win = window.open("", "_blank");
                          if (!win) return;
                          const element = document.createElement("div");
                          const heading = document.createElement("h1");
                          heading.textContent = "Invoice " + invoice.number;
                          element.append(heading);
                          for (const value of [
                            data.project.name,
                            `${money(invoice.amount_minor, invoice.currency)}`,
                            `Status: ${invoice.status}`,
                            `Due: ${displayDate(invoice.due_date)}`,
                          ]) {
                            const p = document.createElement("p");
                            p.textContent = value;
                            element.append(p);
                          }
                          const base = document.createElement("base");
                          base.href = window.location.origin + "/";
                          win.document.head.append(base);
                          for (const stylesheet of document.querySelectorAll(
                            'link[rel="stylesheet"],style',
                          ))
                            win.document.head.append(
                              stylesheet.cloneNode(true),
                            );
                          const style = document.createElement("style");
                          style.textContent =
                            "body{font-family:'Montserrat Variable',sans-serif;background:white;color:#22382d;padding:40px;max-width:800px;margin:auto}h1{font-size:28px;font-weight:600;margin-bottom:32px}p{font-size:14px;line-height:2}@media print{body{padding:0}}";
                          win.document.head.append(style);
                          win.document.title = "Invoice " + invoice.number;
                          win.document.body.append(element);
                          win.print();
                        }}
                      >
                        Print / save as PDF
                      </button>
                    </article>
                  ))}
                </div>
                {manager && (
                  <form
                    onSubmit={createInvoice}
                    className="rounded-lg bg-[#f3f6ed] p-4"
                  >
                    <h3 className="mb-4 text-xs font-semibold">
                      Create an invoice
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-[11px]">
                        Invoice number
                        <input
                          className={inputClass}
                          name="number"
                          maxLength={200}
                          placeholder="INV-001"
                          required
                        />
                      </label>
                      <label className="text-[11px]">
                        Amount
                        <input
                          className={inputClass}
                          name="amount"
                          inputMode="decimal"
                          placeholder="25000.00"
                          required
                        />
                      </label>
                      <label className="text-[11px]">
                        Currency
                        <select className={inputClass} name="currency">
                          <option>KES</option>
                          <option>USD</option>
                          <option>EUR</option>
                          <option>GBP</option>
                        </select>
                      </label>
                      <label className="text-[11px]">
                        Due date
                        <input
                          className={inputClass}
                          name="due_date"
                          type="date"
                        />
                      </label>
                    </div>
                    <button
                      disabled={busy}
                      className={secondaryClass + " mt-4"}
                    >
                      Create draft invoice
                    </button>
                  </form>
                )}
              </section>
            </div>
            <aside className={cardClass}>
              <h2 className="text-lg font-semibold">Project clients</h2>
              <div className="my-5 space-y-4">
                {data.clients.length ? (
                  data.clients.map((client) => (
                    <div
                      key={client.id}
                      className="border-t border-[#e4ebd9] pt-4"
                    >
                      <p className="text-xs font-semibold">{client.name}</p>
                      <p className="mt-2 break-all text-[10px] text-[#89987a]">
                        {client.email}
                      </p>
                      {manager && (
                        <button
                          disabled={busy}
                          className="mt-3 text-[10px] text-red-700 underline"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Remove ${client.name} from this project?`,
                              )
                            )
                              action(
                                "/clients/" + encodeURIComponent(client.id),
                                "DELETE",
                                {},
                                "Client access removed.",
                              );
                          }}
                        >
                          Remove project access
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs leading-6 text-[#89987a]">
                    No clients have joined this project yet.
                  </p>
                )}
              </div>
              {manager && (
                <form
                  onSubmit={(event) =>
                    submit(
                      event,
                      "/invitations",
                      "Invitation created. Its email delivery status is available in Activity.",
                    )
                  }
                >
                  <label className="block text-xs">
                    Invite a client
                    <input
                      className={inputClass}
                      name="email"
                      type="email"
                      placeholder="client@example.com"
                      required
                    />
                  </label>
                  <p className="mt-3 text-[10px] leading-6 text-[#89987a]">
                    Your client receives a private link valid for 48 hours. They
                    can access this project only.
                  </p>
                  <button
                    disabled={busy}
                    className={buttonClass + " mt-4 w-full"}
                  >
                    Send invitation ↗
                  </button>
                </form>
              )}
            </aside>
          </div>
        </>
      )}
    </>
  );
}
