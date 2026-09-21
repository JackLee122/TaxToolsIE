import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Tax credits",
};

export default function CreditsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Tax credits</h1>
      <EmptyState
        title="Credits and reliefs questionnaire is planned for a later phase"
        description="Rent, health expenses, tuition fees, pension contributions and flat-rate expenses will be assessed here so no supported claim is missed."
        hint="Planned phase: credits and reliefs engine."
      />
    </main>
  );
}