import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[#dce3dc] bg-[#fdfefb] py-6">
      <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-3 px-4 text-xs text-[#60716b] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© 2026 TaxToolsIE. Estimates for guidance, never a Revenue filing.</p>
        <Link
          href="/privacy"
          className="font-medium text-[#285c4d] underline decoration-[#aecbb8] underline-offset-4 hover:text-[#173d33]"
        >
          Privacy &amp; data handling
        </Link>
      </div>
    </footer>
  );
}
