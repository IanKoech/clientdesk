import Link from "next/link";
import { Brand } from "@/components/brand";
const features = [
  [
    "01",
    "One home for every project",
    "Keep milestones, files, and feedback together. Give every client a clear view of what comes next.",
  ],
  [
    "02",
    "Feedback that moves work forward",
    "Share deliverables, collect comments, and keep approvals attached to the work.",
  ],
  [
    "03",
    "Less admin. More creating.",
    "Track invoices and project progress without juggling another spreadsheet.",
  ],
];
export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-6 md:px-14">
      <header className="flex h-24 items-center justify-between border-b border-[#dfe4d8]">
        <Brand />
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/login">Sign in</Link>
          <Link
            href="/register"
            className="rounded-lg bg-[#234431] px-5 py-3 text-white"
          >
            Get started ↗
          </Link>
        </nav>
      </header>
      <main>
        <section className="grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <p className="mb-7 text-xs font-bold tracking-[.18em] text-[#718655]">
              YOUR WORK. YOUR CLIENTS. YOUR SPACE.
            </p>
            <h1 className="text-5xl leading-[1.12] font-semibold tracking-[-.05em] md:text-7xl">
              Great work deserves
              <br />a <span className="text-[#78964b]">calmer home.</span>
            </h1>
            <p className="mt-7 max-w-md text-base leading-8 text-[#75806e]">
              Bring your projects, client conversations, and invoices into one
              thoughtful workspace. Less chasing. More creating.
            </p>
            <div className="mt-9 flex items-center gap-6">
              <Link
                href="/register"
                className="rounded-lg bg-[#234431] px-6 py-4 text-sm font-medium text-white"
              >
                Create your workspace ↗
              </Link>
              <Link
                href="/demo"
                className="text-sm font-medium underline underline-offset-4"
              >
                Explore the demo
              </Link>
            </div>
            <p className="mt-5 text-xs text-[#87917d]">
              Built for independent professionals and their clients.
            </p>
          </div>
          <div className="rotate-[-2deg] rounded-3xl bg-[#e7ecdd] p-6 md:p-9">
            <div className="rounded-xl border border-[#d4ddc8] bg-white p-6 shadow-xl shadow-[#233f3010]">
              <div className="flex justify-between">
                <span className="text-xs text-[#7c8772]">PROJECT OVERVIEW</span>
                <span className="rounded-full bg-[#edf2e4] px-3 py-1 text-[10px] text-[#658448]">
                  In progress
                </span>
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                A fresh identity.
                <br />A new beginning.
              </h2>
              <p className="mt-2 text-xs text-[#859079]">
                Brand identity · Sample project
              </p>
              <div className="my-7 h-2 overflow-hidden rounded-full bg-[#edf0e7]">
                <div className="h-full w-2/3 rounded-full bg-[#809b56]" />
              </div>
              {[
                "Discovery & direction",
                "Visual identity",
                "Final handover",
              ].map((label, index) => (
                <div
                  key={label}
                  className="flex items-center gap-3 border-t border-[#edf0e7] py-4 text-sm"
                >
                  <span
                    className={`grid size-6 place-items-center rounded-full text-xs ${index === 0 ? "bg-[#e7efda] text-[#628346]" : "bg-[#f1f3ed] text-[#8b957f]"}`}
                  >
                    {index === 0 ? "✓" : index + 1}
                  </span>
                  {label}
                  <span className="ml-auto text-[10px] text-[#8b957f]">
                    {index === 0
                      ? "Approved"
                      : index === 1
                        ? "In progress"
                        : "Upcoming"}
                  </span>
                </div>
              ))}
              <div className="mt-3 rounded-lg bg-[#f4f6ee] p-4 text-xs leading-5 text-[#758366]">
                “Everything is in one place. We know exactly what’s next.”
                <br />
                <span className="text-[10px]">
                  Illustrative client feedback
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className="grid gap-8 border-t border-[#dfe4d8] py-12 md:grid-cols-3">
          {features.map(([n, title, description]) => (
            <article key={n}>
              <p className="mb-5 text-xs text-[#819766]">/{n}</p>
              <h2 className="mb-3 text-lg font-semibold tracking-tight">
                {title}
              </h2>
              <p className="max-w-sm text-sm leading-7 text-[#7c8772]">
                {description}
              </p>
            </article>
          ))}
        </section>
      </main>
      <footer className="flex justify-between border-t border-[#dfe4d8] py-7 text-xs text-[#89917f]">
        <span>ClientDesk · Foundation release</span>
        <span>Make space for good work.</span>
      </footer>
    </div>
  );
}
