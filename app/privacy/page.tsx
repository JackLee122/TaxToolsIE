import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy & data handling",
};

const principles = [
  {
    title: "Local-first and private",
    body: "TaxToolie runs on your machine. Tax data is stored in a local SQLite database and is never sent to a cloud database, analytics service or telemetry service.",
  },
  {
    title: "No Revenue login, ever",
    body: "The app never asks for your Revenue password, myAccount credentials, ROS password, ROS certificate or two-factor authentication codes, and it never automates a browser login to Revenue.",
  },
  {
    title: "No LLM in the tax path",
    body: "All tax calculations, classifications and eligibility decisions are deterministic and unit-tested. No third-party AI receives your financial data or generates any calculated figure.",
  },
  {
    title: "No third-party document processing",
    body: "PDFs and CSV files are parsed locally. There is no third-party OCR or document-processing API.",
  },
  {
    title: "Raw documents are disposable",
    body: "Uploaded Revenue PDFs and broker files are parsed, you review the extracted values, and the raw file is deleted afterwards. They are not stored long-term.",
  },
  {
    title: "API keys stay server-side",
    body: "If you configure one, a broker API key is read only on the server, is never stored in the database, and is never exposed to the browser.",
  },
  {
    title: "Estimates, not filing",
    body: "Every figure is an estimate for guidance. TaxToolie does not submit returns to Revenue, and supported limits are shown where the calculation cannot cover something.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy &amp; data handling</h1>
      <p className="mt-2 text-sm text-zinc-600">
        TaxToolie is designed as a private, local-first tool for estimating your
        Irish personal tax position.
      </p>
      <ul className="mt-8 space-y-6">
        {principles.map((p) => (
          <li key={p.title}>
            <h2 className="text-sm font-semibold">{p.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600">{p.body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}