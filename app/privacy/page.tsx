import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy & data handling",
};

const principles = [
  {
    title: "Private account data",
    body: "When connected, your tax profile, employment, credit claims, investment entries and import summaries are stored in Supabase. Database row-level policies limit access to your signed-in account. The deployed app runs on Vercel.",
  },
  {
    title: "No Revenue login, ever",
    body: "The app never asks for your Revenue password, myAccount credentials, ROS password, ROS certificate or two-factor authentication codes, and it never automates a browser login to Revenue.",
  },
  {
    title: "No LLM in the tax path",
    body: "Supported tax estimates use deterministic code, and uncertain investment classifications require your review. No third-party AI generates tax figures or receives your financial data through this app.",
  },
  {
    title: "No external document AI",
    body: "Trading 212 CSV files are previewed in your browser and validated on the app server after you confirm import. Revenue PDF import, external OCR and document-processing APIs are not connected.",
  },
  {
    title: "Raw CSV files are not saved",
    body: "After confirmation, the CSV is sent to the app server. The app saves parsed investment entries, the file name and import counts in Supabase, but does not save the original CSV. PDF uploads are not supported.",
  },
  {
    title: "API keys stay server-side",
    body: "No broker API connection is active in the current app.",
  },
  {
    title: "Estimates, not filing",
    body: "Every figure is an estimate for guidance. TaxToolsIE does not submit returns to Revenue, and supported limits are shown where the calculation cannot cover something.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
      <p className="eyebrow mb-3">About your data</p>
      <h1 className="page-title">Privacy &amp; data handling</h1>
      <p className="page-description mt-3">
        TaxToolsIE is designed as a private tool for estimating your Irish personal tax position.
      </p>
      <ul className="card-surface mt-9 divide-y divide-[#e4ebe3] px-6 sm:px-8">
        {principles.map((p) => (
          <li key={p.title} className="py-5">
            <h2 className="text-sm font-semibold text-[#1d302a]">{p.title}</h2>
            <p className="mt-1 text-sm leading-6 text-[#60716b]">{p.body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
