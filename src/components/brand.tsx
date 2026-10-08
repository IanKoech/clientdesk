import Link from "next/link";
export function Brand() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight"
    >
      <span className="grid size-8 place-items-center rounded-lg bg-[#234431] text-lg text-[#dfebbc]">
        c
      </span>
      clientdesk<span className="-ml-2 text-[#829f57]">.</span>
    </Link>
  );
}
