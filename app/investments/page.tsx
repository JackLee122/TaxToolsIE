import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Investments",
};

export default function InvestmentsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Investments</h1>
      <EmptyState
        title="Investment tracking is planned for a later phase"
        description="Share purchases, sales, dividends, deposit interest, Capital Gains Tax and fund/ETF exit-tax tracking will be available here. Until then you can keep trading data in Trading 212."
        hint="Planned phases: Trading 212 import, instrument classification, CGT, dividends/interest, fund tracker."
      />
    </main>
  );
}