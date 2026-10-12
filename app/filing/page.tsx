import type { Metadata } from "next";
import Link from "next/link";
import { listCreditClaims } from "@/lib/supabase/credits";
import { getProfile, listEmployment } from "@/lib/supabase/employment";
import { listInvestmentEntries } from "@/lib/supabase/investments";
import { requireUser } from "@/lib/supabase/server";
import { calculateEmploymentTaxSummary } from "@/lib/domain/employment/summary";
import { classifyFilingRoute } from "@/lib/domain/filing/guidance";
import { sumConfirmedIncomeTaxCredits } from "@/lib/domain/tax/credits";
import { deadlines2026 } from "@/lib/rules/ie/2026/deadlines";
import { add, formatEur, ZERO } from "@/lib/utils/decimal";
import { UnemploymentCalculator } from "./unemployment-calculator";

export const metadata: Metadata = {
  title: "Filing",
};

export default async function FilingPage() {
  const { supabase, userId } = await requireUser();
  const [profile, employment, claims, investments] = await Promise.all([
    getProfile(supabase, userId, 2026),
    listEmployment(supabase, userId, 2026),
    listCreditClaims(supabase, userId, 2026),
    listInvestmentEntries(supabase, userId, 2026),
  ]);
  const currentInvestments = investments.filter((entry) => entry.taxYear === 2026);
  const nonPayeIncome = currentInvestments
    .filter(
      (entry) =>
        entry.reviewStatus === "CONFIRMED" &&
        (entry.kind === "DIVIDEND" || entry.kind === "INTEREST"),
    )
    .reduce((total, entry) => add(total, entry.eurAmount ?? ZERO), ZERO);
  const route = classifyFilingRoute({
    taxableNonPayeIncomeEur: nonPayeIncome,
    grossNonPayeIncomeEur: nonPayeIncome,
  });
  const summary =
    employment.length > 0
      ? calculateEmploymentTaxSummary(
          2026,
          employment,
          profile?.calculationStatus === "SUPPORTED",
          sumConfirmedIncomeTaxCredits(claims),
          currentInvestments.length,
        )
      : null;
  const unresolved =
    currentInvestments.length > 0 ||
    claims.some((claim) => claim.status !== "USER_CONFIRMED") ||
    !profile ||
    profile.calculationStatus !== "SUPPORTED";
  const disposals = currentInvestments.filter((entry) => entry.kind === "SELL");
  return (
    <main className="app-shell">
      <p className="eyebrow mb-3">2026 / Guidance</p>
      <h1 className="page-title">What to enter in Revenue</h1>
      <p className="page-description mb-9 mt-3">
        A working checklist from your saved records. TaxToolsIE does not submit a return.
      </p>
      <div
        className={`mb-8 rounded-xl border px-5 py-4 text-sm ${unresolved ? "border-amber-200 bg-amber-50 text-amber-950" : "border-[#c9e3cd] bg-[#edf7ef] text-[#285c4d]"}`}
      >
        <p className="font-semibold">
          {unresolved
            ? "Review required before using these figures"
            : "Employment records ready to compare"}
        </p>
        <p className="mt-1">
          {unresolved
            ? "Investment tax calculations or claim checks are incomplete, or your profile is outside the supported scope. Do not treat this as a final filing amount."
            : "Compare these records with Revenue’s figures before filing. The estimate is not a Revenue assessment."}
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card-surface p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-[#1d302a]">PAYE employment</h2>
          <p className="mt-2 text-sm leading-6 text-[#60716b]">
            Revenue normally holds employer-reported pay and tax. Compare these amounts with your
            Employment Detail Summary rather than entering them twice.
          </p>
          {summary ? (
            <dl className="mt-5 space-y-3 border-t border-[#e4ebe3] pt-5 text-sm">
              {[
                ["Pay for Income Tax", summary.totals.payForIncomeTax],
                ["PAYE deducted", summary.totals.incomeTaxDeducted],
                ["Pay for USC", summary.totals.payForUsc],
                ["USC deducted", summary.totals.uscDeducted],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-[#60716b]">{label}</dt>
                  <dd className="font-semibold text-[#1d302a]">{formatEur(value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-5 text-sm text-[#60716b]">
              No employment data yet.{" "}
              <Link href="/employment" className="text-[#285c4d] underline">
                Add employment
              </Link>
              .
            </p>
          )}
        </section>
        <section className="card-surface p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-[#1d302a]">Credits and reliefs</h2>
          <p className="mt-2 text-sm leading-6 text-[#60716b]">
            Check each claim in the relevant myAccount section. Values marked for review are not
            ready to enter.
          </p>
          {claims.length === 0 ? (
            <p className="mt-5 text-sm text-[#60716b]">
              No claims recorded.{" "}
              <Link href="/credits" className="text-[#285c4d] underline">
                Review possible claims
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-5 space-y-3 border-t border-[#e4ebe3] pt-5 text-sm">
              {claims.map((claim) => (
                <li key={claim.id} className="flex justify-between gap-3">
                  <span>{claim.type.replaceAll("_", " ")}</span>
                  <span className="font-semibold">
                    {claim.status === "USER_CONFIRMED"
                      ? formatEur(claim.estimatedTaxValue)
                      : claim.status === "ALREADY_CLAIMED"
                        ? "Already claimed"
                        : "Review"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section className="card-surface mt-5 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-[#1d302a]">Non-PAYE income and filing route</h2>
        <p className="mt-2 text-sm leading-6 text-[#60716b]">
          Confirmed 2026 dividends and interest: {formatEur(nonPayeIncome)} gross EUR. This excludes
          records still under review, unrecorded income, and amounts awaiting conversion.
        </p>
        <p className="mt-4 text-sm font-semibold text-[#314b40]">
          {!profile ||
          profile.calculationStatus !== "SUPPORTED" ||
          employment.length === 0 ||
          currentInvestments.length > 0
            ? "Provisional route only: "
            : "Likely route: "}
          {route === "MYACCOUNT_PAYE_RETURN"
            ? "PAYE Income Tax Return in myAccount"
            : route === "SELF_ASSESSMENT_FORM_11"
              ? "Self-assessment / Form 11 review"
              : "Boundary needs review"}
        </p>
        <p className="mt-2 text-xs leading-5 text-[#60716b]">
          Revenue’s self-assessment threshold is taxable non-PAYE income over €5,000 or gross
          non-PAYE income over €30,000. Confirm your full income with Revenue before choosing a
          route.
        </p>
        <a
          href="https://www.revenue.ie/en/jobs-and-pensions/end-of-year-process/need-to-submit-a-tax-return.aspx"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs font-semibold text-[#285c4d] underline underline-offset-4"
        >
          Revenue filing guidance
        </a>
      </section>
      {disposals.length > 0 ? (
        <section className="card-surface mt-5 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-[#1d302a]">Share disposal actions</h2>
          <p className="mt-2 text-sm leading-6 text-[#60716b]">
            {disposals.length} sale event(s) recorded. CGT gain and tax calculations are not yet
            verified, so no CGT amount is shown.
          </p>
          <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-[#465b52]">
            <li>
              1 January–30 November disposals: payment generally by{" "}
              {deadlines2026.cgtInitialPeriodPaymentDate}.
            </li>
            <li>
              1–31 December disposals: payment generally by{" "}
              {deadlines2026.cgtLaterPeriodPaymentDate}.
            </li>
            <li>
              2026 return: generally by {deadlines2026.cgtReturnDate}, including disposals with no
              tax due where a return is required.
            </li>
          </ul>
          <a
            href={deadlines2026.source.url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-xs font-semibold text-[#285c4d] underline"
          >
            Revenue CGT payment and filing
          </a>
        </section>
      ) : null}
      <div className="mt-8">
        <UnemploymentCalculator />
      </div>
    </main>
  );
}
