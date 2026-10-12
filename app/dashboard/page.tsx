import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { getProfile, listEmployment } from "@/lib/supabase/employment";
import { listCreditClaims } from "@/lib/supabase/credits";
import { countInvestmentEntries } from "@/lib/supabase/investments";
import { requireUser } from "@/lib/supabase/server";
import { calculateEmploymentTaxSummary } from "@/lib/domain/employment/summary";
import { sumConfirmedIncomeTaxCredits } from "@/lib/domain/tax/credits";
import { formatEur } from "@/lib/utils/decimal";

export const metadata: Metadata = { title: "Dashboard" };

const taxYear = 2026;

export default async function DashboardPage() {
  const { supabase, userId } = await requireUser();
  const [profile, employment, claims, investmentCount] = await Promise.all([
    getProfile(supabase, userId, taxYear),
    listEmployment(supabase, userId, taxYear),
    listCreditClaims(supabase, userId, taxYear),
    countInvestmentEntries(supabase, userId, taxYear),
  ]);

  if (!profile || employment.length === 0) {
    const noProfile = !profile;
    return (
      <main className="app-shell">
        <div className="mb-9">
          <p className="eyebrow mb-3">2026 / Overview</p>
          <h1 className="page-title">Your tax position</h1>
          <p className="page-description mt-3">
            A clearer view of your PAYE income, tax paid and estimated outcome.
          </p>
        </div>
        <EmptyState
          title={noProfile ? "Create a tax profile to begin" : "No employment data yet"}
          description={
            noProfile
              ? "Start a supported 2026 profile, then add PAYE employment records."
              : "Add PAYE employment income and deductions to see an estimated Income Tax and USC position."
          }
        />
        <Link href="/employment" className="button-primary mt-5">
          {noProfile ? "Set up your profile" : "Add employment"}
        </Link>
      </main>
    );
  }

  const summary = calculateEmploymentTaxSummary(
    taxYear,
    employment,
    profile.calculationStatus === "SUPPORTED",
    sumConfirmedIncomeTaxCredits(claims),
    investmentCount + claims.filter((claim) => claim.status !== "USER_CONFIRMED").length,
  );
  const complete = summary.position.finalEstimateStatus === "COMPLETE";
  const refund = summary.position.estimatedPayeRefundEur;
  const underpayment = summary.position.estimatedPayeUnderpaymentEur;
  const outcomeLabel = refund !== "0" ? "Estimated PAYE refund" : "Estimated PAYE underpayment";
  const outcomeAmount = formatEur(refund !== "0" ? refund : underpayment);

  return (
    <main className="app-shell">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow mb-3">2026 / Overview</p>
          <h1 className="page-title">Your tax position</h1>
          <p className="page-description mt-3">
            Based on the employment figures you entered. This is an estimate, not a Revenue
            assessment.
          </p>
        </div>
        <Link href="/employment" className="button-secondary">
          Manage employment
        </Link>
      </div>
      <section
        aria-label="Estimated outcome"
        className="card-surface grid overflow-hidden lg:grid-cols-[1.05fr_1fr]"
      >
        <div className="bg-[#285c4d] px-6 py-8 text-[#f7fbf5] sm:px-9 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#cde6d9]">
            2026 PAYE estimate
          </p>
          <h2 className="mt-6 text-base font-medium text-[#e2efe7]">
            {complete ? outcomeLabel : "Estimate incomplete"}
          </h2>
          <p className="mt-2 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
            {complete ? outcomeAmount : "Review needed"}
          </p>
          <p className="mt-7 max-w-sm text-xs leading-6 text-[#d1e8da]">
            {complete
              ? "Calculated from your saved employment and confirmed basic credit claims. Check against Revenue before filing."
              : profile.calculationStatus !== "SUPPORTED"
                ? "Your profile is outside the current calculation scope. The figures alongside are employment-based only."
                : `${summary.position.unresolvedItemsCount} item(s) still need tax review. The figures alongside are employment-based only.`}
          </p>
        </div>
        <dl className="divide-y divide-[#e4ebe3] px-6 py-3 sm:px-9">
          {[
            ["Employment income", formatEur(summary.totals.payForIncomeTax)],
            [
              "Employment-based Income Tax",
              formatEur(summary.incomeTax.estimatedIncomeTaxLiability),
            ],
            ["Employment-based USC", formatEur(summary.usc.estimatedUscLiability)],
          ].map(([label, amount]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-5">
              <dt className="metric-label">{label}</dt>
              <dd className="text-lg font-semibold tracking-tight text-[#1d302a]">{amount}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="mt-10">
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight text-[#1d302a]">
            Tax already deducted
          </h2>
          <p className="mt-1 text-sm text-[#60716b]">
            Amounts reported in your employment records.
          </p>
        </div>
        <dl className="card-surface grid divide-y divide-[#e4ebe3] px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-0">
          {[
            ["PAYE", summary.totals.incomeTaxDeducted],
            ["USC", summary.totals.uscDeducted],
            ["PRSI", summary.totals.prsiDeducted],
          ].map(([label, amount]) => (
            <div key={label} className="py-5 sm:px-6">
              <dt className="metric-label">{label}</dt>
              <dd className="metric-value mt-1">{formatEur(amount)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-[#60716b]">
          PRSI is shown from your records but is not included in this MVP estimate.
        </p>
      </section>
      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight text-[#1d302a]">Workspace status</h2>
        <div className="card-surface mt-4 grid divide-y divide-[#e4ebe3] px-6 text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-0">
          <Link href="/employment" className="block py-5 sm:px-6">
            <span className="metric-label">Employment records</span>
            <span className="metric-value mt-1 block">{employment.length}</span>
            <span className="mt-2 block text-xs font-medium text-[#285c4d]">Review records →</span>
          </Link>
          <Link href="/credits" className="block py-5 sm:px-6">
            <span className="metric-label">Credit claims recorded</span>
            <span className="metric-value mt-1 block">{claims.length}</span>
            <span className="mt-2 block text-xs font-medium text-[#285c4d]">Review claims →</span>
          </Link>
          <Link href="/investments" className="block py-5 sm:px-6">
            <span className="metric-label">2026 investment events</span>
            <span className="metric-value mt-1 block">{investmentCount}</span>
            <span className="mt-2 block text-xs font-medium text-[#285c4d]">
              Review investments →
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
