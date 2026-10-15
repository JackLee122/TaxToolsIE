import type { Metadata } from "next";
import Link from "next/link";
import { listCreditClaims } from "@/lib/supabase/credits";
import { getProfile, listEmployment } from "@/lib/supabase/employment";
import { listFundUnitValuations, listInvestmentEntries } from "@/lib/supabase/investments";
import { calculateShareSaleGains2026 } from "@/lib/domain/investments/share-gains";
import { calculateFundPosition2026 } from "@/lib/domain/investments/fund-events";
import { requireUser } from "@/lib/supabase/server";
import { calculateEmploymentTaxSummary } from "@/lib/domain/employment/summary";
import { classifyFilingRoute } from "@/lib/domain/filing/guidance";
import { sumConfirmedIncomeTaxCredits } from "@/lib/domain/tax/credits";
import { deadlines2026 } from "@/lib/rules/ie/2026/deadlines";
import { cgt2026 } from "@/lib/rules/ie/2026/cgt";
import { funds2026 } from "@/lib/rules/ie/2026/funds";
import { credits2026 } from "@/lib/rules/ie/2026/credits";
import { incomeTax2026 } from "@/lib/rules/ie/2026/incomeTax";
import { usc2026 } from "@/lib/rules/ie/2026/usc";
import { add, d, formatEur, ZERO } from "@/lib/utils/decimal";
import { UnemploymentCalculator } from "./unemployment-calculator";

export const metadata: Metadata = {
  title: "Filing",
};

const percent = (rate: string) => `${d(rate).times(100).toString()}%`;

export default async function FilingPage() {
  const { supabase, userId } = await requireUser();
  const [profile, employment, claims, investments, fundValuations] = await Promise.all([
    getProfile(supabase, userId, 2026),
    listEmployment(supabase, userId, 2026),
    listCreditClaims(supabase, userId, 2026),
    listInvestmentEntries(supabase, userId),
    listFundUnitValuations(supabase, userId),
  ]);
  const currentInvestments = investments.filter((entry) => entry.taxYear === 2026);
  const confirmedDividends = currentInvestments.filter(
    (entry) =>
      entry.reviewStatus === "CONFIRMED" &&
      entry.kind === "DIVIDEND" &&
      entry.classification === "SHARE_CGT",
  );
  const confirmedInterest = currentInvestments.filter(
    (entry) => entry.reviewStatus === "CONFIRMED" && entry.kind === "INTEREST",
  );
  const sumEur = (entries: typeof currentInvestments) =>
    entries.reduce((total, entry) => add(total, entry.eurAmount ?? ZERO), ZERO);
  const dividendIncome = sumEur(confirmedDividends);
  const interestIncome = sumEur(confirmedInterest);
  const route = classifyFilingRoute({
    taxableNonPayeIncomeEur: dividendIncome,
    grossNonPayeIncomeEur: dividendIncome,
  });
  const routeNeedsIncomeReview = currentInvestments.some(
    (entry) =>
      entry.kind === "INTEREST" ||
      entry.kind === "OTHER" ||
      (entry.kind === "DIVIDEND" &&
        (entry.reviewStatus !== "CONFIRMED" || entry.classification !== "SHARE_CGT")),
  );
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
  const shareDisposals = currentInvestments.filter(
    (entry) => entry.kind === "SELL" && entry.classification === "SHARE_CGT",
  );
  const shareSaleGains = calculateShareSaleGains2026(investments);
  const matchedShareSales = shareSaleGains.filter((sale) => sale.status === "MATCHED").length;
  const fundPosition = calculateFundPosition2026(investments, fundValuations);
  const fundEvents2026 = fundPosition.events.filter((event) => event.eventDate.startsWith("2026-"));
  const matchedFundEvents2026 = fundEvents2026.filter(
    (event) => event.status === "CALCULATED",
  ).length;
  const fundDisposals = currentInvestments.filter(
    (entry) => entry.kind === "SELL" && entry.classification === "FUND_EXIT_TAX_38_2026",
  );
  const unclassifiedDisposals = currentInvestments.filter(
    (entry) =>
      entry.kind === "SELL" &&
      (entry.classification === "UNKNOWN" || entry.classification === "UNSUPPORTED"),
  );
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
      <section className="card-surface mb-5 p-6 sm:p-8">
        <p className="eyebrow mb-2">Rules checked 15 October 2026</p>
        <h2 className="text-xl font-semibold text-[#1d302a]">2026 rates used by this workspace</h2>
        <p className="mt-2 text-sm leading-6 text-[#60716b]">
          This workspace calculates for 2026 only. Proposed 2027 rates are not applied to 2026
          income. The ordinary-share CGT change effective during 2026 is reflected below.
        </p>
        <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="font-semibold text-[#1d302a]">Single-person Income Tax</dt>
            <dd className="mt-1 text-[#60716b]">
              First {formatEur(incomeTax2026.singleStandardRateCutoff)} at{" "}
              {percent(incomeTax2026.standardRate)}; balance at {percent(incomeTax2026.higherRate)}.
              Personal credit {formatEur(incomeTax2026.personalTaxCredit)}; Employee credit up to{" "}
              {formatEur(incomeTax2026.employeeTaxCreditMaximum)}.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[#1d302a]">Standard USC</dt>
            <dd className="mt-1 text-[#60716b]">
              Exempt at or below {formatEur(usc2026.exemptionThreshold)}. Above that: first{" "}
              {formatEur(usc2026.bands[0].upTo!)} at {percent(usc2026.bands[0].rate)}, then to{" "}
              {formatEur(usc2026.bands[1].upTo!)} at {percent(usc2026.bands[1].rate)}, then to{" "}
              {formatEur(usc2026.bands[2].upTo!)} at {percent(usc2026.bands[2].rate)}; balance at{" "}
              {percent(usc2026.bands[3].rate)}. Reduced USC eligibility is outside this estimate.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[#1d302a]">Rent Tax Credit</dt>
            <dd className="mt-1 text-[#60716b]">
              Up to {formatEur(credits2026.rentCreditMaximum)} for the supported single-person
              profile, subject to eligibility and Income Tax liability.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[#1d302a]">Ordinary-share CGT standard rate</dt>
            <dd className="mt-1 text-[#60716b]">
              {percent(cgt2026.standardRateBeforeChange)} through 6 October 2026;{" "}
              {percent(cgt2026.standardRateFromChange)} from {cgt2026.reducedRateEffectiveDate}. The{" "}
              {formatEur(cgt2026.annualPersonalExemption)} annual exemption is not applied to draft
              sale gains.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[#1d302a]">
              Equivalent offshore fund individual rate
            </dt>
            <dd className="mt-1 text-[#60716b]">
              {percent(funds2026.equivalentOffshoreIndividualRate)} for qualifying 2026 chargeable
              events. The rate is not applied to draft recorded gains here.
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-[#60716b]">
          Sources:{" "}
          <a href={incomeTax2026.source.url} target="_blank" rel="noreferrer" className="underline">
            Revenue Income Tax
          </a>
          ,{" "}
          <a href={usc2026.source.url} target="_blank" rel="noreferrer" className="underline">
            Revenue USC
          </a>
          ,{" "}
          <a href={credits2026.source.url} target="_blank" rel="noreferrer" className="underline">
            Revenue credits
          </a>
          ,{" "}
          <a href={cgt2026.rateSource.url} target="_blank" rel="noreferrer" className="underline">
            Revenue CGT rate change
          </a>
          , and{" "}
          <a href={funds2026.rateSource.url} target="_blank" rel="noreferrer" className="underline">
            Revenue fund rate
          </a>
          .
        </p>
      </section>
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
          Confirmed 2026 ordinary-share dividends: {formatEur(dividendIncome)} gross EUR. Confirmed
          interest: {formatEur(interestIncome)} gross EUR. These are recorded income, not tax due.
          Fund distributions, unclassified dividends, unrecorded income and amounts awaiting
          conversion are excluded.
        </p>
        <p className="mt-4 text-sm font-semibold text-[#314b40]">
          {!profile ||
          profile.calculationStatus !== "SUPPORTED" ||
          employment.length === 0 ||
          currentInvestments.length > 0
            ? "Provisional route only: "
            : "Likely route: "}
          {routeNeedsIncomeReview && route !== "SELF_ASSESSMENT_FORM_11"
            ? "Income source and filing route need review"
            : route === "MYACCOUNT_PAYE_RETURN"
              ? "PAYE Income Tax Return in myAccount"
              : route === "SELF_ASSESSMENT_FORM_11"
                ? "Self-assessment / Form 11 review"
                : "Boundary needs review"}
        </p>
        <p className="mt-2 text-xs leading-5 text-[#60716b]">
          This provisional route considers only confirmed ordinary-share dividends. Deposit interest
          and fund payments need separate treatment checks. Revenue’s self-assessment threshold is
          taxable non-PAYE income over €5,000 or gross non-PAYE income over €30,000. Confirm your
          full income with Revenue before choosing a route.
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
      {shareDisposals.length +
        fundDisposals.length +
        unclassifiedDisposals.length +
        fundEvents2026.length +
        fundPosition.issues.length >
      0 ? (
        <section className="card-surface mt-5 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-[#1d302a]">Investment disposal actions</h2>
          <p className="mt-2 text-sm leading-6 text-[#60716b]">
            {shareDisposals.length} ordinary-share sale(s), {fundDisposals.length} fund-regime
            sale(s), and {unclassifiedDisposals.length} unclassified or unsupported sale(s)
            recorded. These are separate tax categories. {matchedShareSales} of the ordinary-share
            sales have draft recorded-lot gains in Investments. No amount payable is shown.
          </p>
          {fundEvents2026.length > 0 || fundPosition.issues.length > 0 ? (
            <p className="mt-3 text-sm leading-6 text-[#60716b]">
              {fundEvents2026.length} recorded 2026 fund sale or eight-year event(s), of which{" "}
              {matchedFundEvents2026} have draft recorded differences. {fundPosition.issues.length}{" "}
              instrument history item(s) need review. This schedule cannot establish that all
              holdings or chargeable events have been recorded.
            </p>
          ) : null}
          {shareDisposals.length > 0 ? (
            <p className="mt-3 text-sm leading-6 text-[#60716b]">
              Ordinary-share gains generally use CGT. The standard rate changed from 33% to 31% for
              disposals on or after 7 October 2026. Lot matching, losses and the annual exemption
              must be resolved before calculating tax.
            </p>
          ) : null}
          {shareDisposals.length > 0 ? (
            <Link
              href="/investments"
              className="mt-2 inline-block text-sm font-semibold text-[#285c4d] underline"
            >
              Review share-gain matches and source trades
            </Link>
          ) : null}
          {fundDisposals.length > 0 ||
          fundEvents2026.length > 0 ||
          fundPosition.issues.length > 0 ? (
            <p className="mt-3 text-sm leading-6 text-[#60716b]">
              Qualifying fund gains may be in the separate 38% regime. Review the fund lot schedule,
              anniversary valuations and any prior deemed-event tax before filing. CGT exemptions do
              not apply.
            </p>
          ) : null}
          {fundDisposals.length > 0 ||
          fundEvents2026.length > 0 ||
          fundPosition.issues.length > 0 ? (
            <Link
              href="/investments"
              className="mt-2 inline-block text-sm font-semibold text-[#285c4d] underline"
            >
              Review fund events and source values
            </Link>
          ) : null}
          {unclassifiedDisposals.length > 0 ? (
            <p className="mt-3 text-sm font-medium text-amber-900">
              Classify the remaining sale(s) before using this checklist for filing.
            </p>
          ) : null}
          {shareDisposals.length > 0 ? (
            <>
              <h3 className="mt-5 text-sm font-semibold text-[#1d302a]">
                Ordinary-share CGT dates
              </h3>
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
                  2026 return: generally by {deadlines2026.cgtReturnDate}, including disposals with
                  no tax due where a return is required.
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
            </>
          ) : null}
        </section>
      ) : null}
      <div className="mt-8">
        <UnemploymentCalculator />
      </div>
    </main>
  );
}
