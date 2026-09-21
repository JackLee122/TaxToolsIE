import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Filing",
};

export default function FilingPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Filing</h1>
      <EmptyState
        title="Filing guidance is planned for a later phase"
        description="This page will tell you exactly which figures to enter into Revenue myAccount or ROS, with deadlines and a calculation audit trail."
        hint="Planned phases: refund engine, unemployment guidance, filing-requirement classifier and the what-to-enter-in-Revenue assistant."
      />
    </main>
  );
}