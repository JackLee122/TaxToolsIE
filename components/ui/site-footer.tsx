import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          TaxToolie · Irish Personal Tax Dashboard. Estimates only - not a Revenue
          filing agent, and never submits returns.
        </p>
        <Link href="/privacy" className="underline decoration-zinc-300 hover:text-zinc-800">
          Privacy &amp; data handling
        </Link>
      </div>
    </footer>
  );
}