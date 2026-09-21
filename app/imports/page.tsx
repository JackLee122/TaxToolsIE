import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Imports",
};

export default function ImportsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Imports</h1>
      <EmptyState
        title="Document imports are planned for a later phase"
        description="Revenue Employment Detail Summary PDFs, Statement of Liability PDFs and Trading 212 CSV files will be parsed and reviewed here."
        hint="Planned phases: Revenue EDS, Statement of Liability, Trading 212 CSV and API."
      />
    </main>
  );
}