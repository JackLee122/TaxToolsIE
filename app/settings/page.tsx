import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Settings</h1>
      <EmptyState
        title="Settings are not needed yet"
        description="Broker accounts, sync configuration and the supported-profile guardrail will live here in later phases."
        hint="Planned phases: supported-user questions, Trading 212 sync, data export."
      />
    </main>
  );
}