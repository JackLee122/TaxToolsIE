import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Setup pending" };

export default function SetupPage() {
  if (isSupabaseConfigured()) redirect("/login");
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-20">
      <p className="eyebrow mb-3">Connection pending</p>
      <h1 className="page-title">Almost ready.</h1>
      <p className="page-description mt-3">
        TaxToolsIE needs its Supabase project URL and publishable key before accounts and tax data
        can be used.
      </p>
      <div className="card-surface mt-8 p-6 sm:p-8">
        <p className="text-sm font-semibold text-[#1d302a]">What is available now</p>
        <p className="mt-2 text-sm leading-6 text-[#60716b]">
          The interface is prepared, but sign-in and saved records will remain unavailable until the
          database connection is configured.
        </p>
      </div>
    </main>
  );
}
