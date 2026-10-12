import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <main className="app-shell">
      <p className="eyebrow mb-3">Planned workspace</p>
      <h1 className="page-title">Settings</h1>
      <p className="page-description mb-9 mt-3">
        Manage account and tax workspace preferences when available.
      </p>
      <EmptyState
        title="Settings are not needed yet"
        description="Broker accounts, sync configuration and the supported-profile guardrail will live here in later phases."
        hint="Planned phases: supported-user questions, Trading 212 sync, data export."
      />
    </main>
  );
}
