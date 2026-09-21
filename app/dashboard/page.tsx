import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">2026 Tax Position</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Employment income, taxes paid and estimated outcomes for the 2026 tax
          year, once data is entered.
        </p>
      </div>

      <EmptyState
        title="No tax data yet"
        description="This dashboard will show your estimated Income Tax, USC, refund or underpayment, plus CGT and fund tax positions. Start by adding your employment income or importing a Revenue Employment Detail Summary."
        hint="Coming up next: employment entry, Revenue EDS import, Trading 212 import, credits questionnaire and the what-to-enter-in-Revenue assistant."
      />
    </main>
  );
}