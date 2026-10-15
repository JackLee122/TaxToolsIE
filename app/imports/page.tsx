import type { Metadata } from "next";
import Link from "next/link";
import { listImportBatches } from "@/lib/supabase/investments";
import { requireUser } from "@/lib/supabase/server";
import { Trading212Upload } from "./trading212-upload";

export const metadata: Metadata = {
  title: "Imports",
};

export default async function ImportsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; imported?: string; duplicates?: string }>;
}) {
  const { supabase, userId } = await requireUser();
  const [batches, params] = await Promise.all([listImportBatches(supabase, userId), searchParams]);
  return (
    <main className="app-shell">
      <p className="eyebrow mb-3">2026 / Data and history</p>
      <h1 className="page-title">Imports</h1>
      <p className="page-description mb-9 mt-3">
        Bring broker activity into your workspace, review it, and keep an import history.
      </p>
      {params.error ? (
        <p role="alert" className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {params.error}
        </p>
      ) : null}
      {params.imported ? (
        <p role="status" className="mb-6 rounded-lg bg-[#e2f0e5] px-4 py-3 text-sm text-[#285c4d]">
          Imported {params.imported} events. Skipped {params.duplicates ?? "0"} duplicates. Review
          the new entries in{" "}
          <Link href="/investments" className="font-semibold underline underline-offset-2">
            Investments
          </Link>
          .
        </p>
      ) : null}
      <Trading212Upload />
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-[#1d302a]">Import history</h2>
        {batches.length === 0 ? (
          <p className="mt-2 text-sm text-[#60716b]">No files imported yet.</p>
        ) : (
          <div className="card-surface mt-4 divide-y divide-[#e4ebe3]">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <p className="font-semibold text-[#1d302a]">{batch.fileName}</p>
                  <p className="mt-1 text-xs text-[#60716b]">
                    {batch.source} · {new Date(batch.createdAt).toLocaleDateString("en-IE")}
                  </p>
                </div>
                <p className="text-sm text-[#465b52]">
                  {batch.importedCount} imported · {batch.duplicateCount} duplicates ·{" "}
                  {batch.reviewCount} review
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
      <p className="mt-8 max-w-2xl text-xs leading-6 text-[#60716b]">
        Revenue PDF parsing and broker API sync require verified document formats and credentials.
        No raw PDF or CSV is stored by this importer.
      </p>
    </main>
  );
}
