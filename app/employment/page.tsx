import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Employment",
};

export default function EmploymentPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Employment</h1>
      <EmptyState
        title="Employment entry is coming next"
        description="You will be able to record PAYE employment income, tax already deducted and pension contributions here, and import values from a Revenue Employment Detail Summary."
        hint="Planned phase: manual employment entry and Revenue EDS import."
      />
    </main>
  );
}