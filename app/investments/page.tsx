import type { Metadata } from "next";
import { addEntry, confirmEntry, removeEntry, saveFundValuation } from "./actions";
import { listFundUnitValuations, listInvestmentEntries } from "@/lib/supabase/investments";
import { calculateShareSaleGains2026 } from "@/lib/domain/investments/share-gains";
import { calculateFundPosition2026 } from "@/lib/domain/investments/fund-events";
import { cgt2026 } from "@/lib/rules/ie/2026/cgt";
import { funds2026 } from "@/lib/rules/ie/2026/funds";
import { requireUser } from "@/lib/supabase/server";
import { d, formatEur } from "@/lib/utils/decimal";

export const metadata: Metadata = {
  title: "Investments",
};

export default async function InvestmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { supabase, userId } = await requireUser();
  const [entries, valuations, params] = await Promise.all([
    listInvestmentEntries(supabase, userId),
    listFundUnitValuations(supabase, userId),
    searchParams,
  ]);
  const reviewCount = entries.filter((entry) => entry.reviewStatus === "REQUIRES_REVIEW").length;
  const historicalCount = entries.filter((entry) => entry.taxYear < 2026).length;
  const shareSales = calculateShareSaleGains2026(entries);
  const fundPosition = calculateFundPosition2026(entries, valuations);
  return (
    <main className="app-shell">
      <p className="eyebrow mb-3">2026 / Records and history</p>
      <h1 className="page-title">Investments</h1>
      <p className="page-description mb-9 mt-3">
        Record 2026 trades and income plus earlier trades needed to establish holdings and cost
        basis. Confirm each instrument’s tax treatment and event-date euro amount. Tax-due
        calculations remain unavailable until complete lots and relevant reliefs can be checked.
      </p>
      {params.saved ? (
        <p role="status" className="mb-6 rounded-lg bg-[#e2f0e5] px-4 py-3 text-sm text-[#285c4d]">
          Investment entry saved.
        </p>
      ) : null}
      {params.error ? (
        <p role="alert" className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {params.error}
        </p>
      ) : null}
      <section className="card-surface mb-10 p-6 sm:p-8">
        <p className="eyebrow mb-2">Manual entry</p>
        <h2 className="text-xl font-semibold text-[#1d302a]">Add an investment event</h2>
        <p className="mt-2 text-sm text-[#60716b]">
          Enter original currency and, for non-euro events, the broker’s euro figure or an
          event-date conversion. Earlier-year events are retained for history, not added to 2026
          taxable income.
        </p>
        <form action={addEntry} className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium">
              Date (2026 or earlier)
              <input
                className="field-input"
                type="date"
                name="eventDate"
                max="2026-12-31"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Event
              <select className="field-input" name="kind">
                <option value="BUY">Purchase</option>
                <option value="SELL">Sale</option>
                <option value="DIVIDEND">Dividend</option>
                <option value="INTEREST">Interest</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Asset or source
              <input className="field-input" name="assetName" maxLength={200} required />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              ISIN (preferred) or ticker
              <input className="field-input" name="symbol" maxLength={40} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Quantity{" "}
              <span className="text-xs font-normal text-[#60716b]">
                Required for purchases and sales
              </span>
              <input className="field-input" name="quantity" inputMode="decimal" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Tax treatment
              <select className="field-input" name="classification" defaultValue="UNKNOWN">
                <option value="UNKNOWN">Needs classification</option>
                <option value="SHARE_CGT">Ordinary share / CGT</option>
                <option value="FUND_EXIT_TAX_38_2026">Fund regime (user-confirmed)</option>
                <option value="UNSUPPORTED">Other / unsupported</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Fund calculation method, if verified
              <select className="field-input" name="fundTaxMethod" defaultValue="">
                <option value="">Not verified / Irish fund / other</option>
                <option value="OFFSHORE_EQUIVALENT_FIFO">Equivalent offshore fund, FIFO</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Eight-year start date for pre-2022 fund purchases
              <input
                className="field-input"
                type="date"
                name="fundDeemedStartDate"
                max="2026-12-31"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Gross amount
              <input
                className="field-input"
                name="grossAmount"
                inputMode="decimal"
                defaultValue="0"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Currency
              <input
                className="field-input"
                name="currency"
                defaultValue="EUR"
                maxLength={3}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              EUR amount{" "}
              <span className="text-xs font-normal text-[#60716b]">
                If original currency is not EUR
              </span>
              <input className="field-input" name="eurAmount" inputMode="decimal" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Fees (original currency)
              <input
                className="field-input"
                name="feeAmount"
                inputMode="decimal"
                defaultValue="0"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Tax withheld
              <input
                className="field-input"
                name="withholdingAmount"
                inputMode="decimal"
                defaultValue="0"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Income jurisdiction
              <input
                className="field-input"
                name="incomeJurisdiction"
                placeholder="e.g. Ireland, USA"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Interest source type
              <input
                className="field-input"
                name="interestSourceType"
                placeholder="e.g. Irish deposit"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium">
            Notes / treatment evidence (required for fund calculation)
            <input className="field-input" name="note" maxLength={500} />
          </label>
          <label className="flex items-start gap-2 text-sm text-[#465b52]">
            <input
              type="checkbox"
              name="classificationConfirmed"
              className="mt-1 size-4 accent-[#285c4d]"
            />
            <span>
              I have checked this instrument’s tax treatment. The app does not classify ETFs
              automatically. For a pre-2022 fund purchase, I have also checked the eight-year start
              date and recorded the classification and date evidence in Notes.
            </span>
          </label>
          <button className="button-primary">Add event</button>
        </form>
      </section>
      <section className="card-surface mb-10 p-6 sm:p-8">
        <p className="eyebrow mb-2">Irish tax reference</p>
        <h2 className="text-xl font-semibold text-[#1d302a]">What the investment may trigger</h2>
        <p className="mt-2 text-sm leading-6 text-[#60716b]">
          These are general rules for an Irish-resident individual, not an automatic classification
          or personal tax calculation. Verify the instrument, ownership, domicile, withholding and
          any reliefs before filing.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[#e4ebe3] p-4 text-sm">
            <h3 className="font-semibold text-[#1d302a]">Ordinary shares</h3>
            <p className="mt-2 leading-6 text-[#60716b]">
              A disposal generally falls under CGT. The standard rate is 33% before 7 October 2026
              and 31% from that date. The €1,270 annual exemption applies after allowable losses.
              Acquisition lots, fees and the four-week matching rules affect the gain.
            </p>
            <a
              className="mt-2 inline-block text-[#285c4d] underline"
              href="https://www.revenue.ie/en/gains-gifts-and-inheritance/transfering-an-asset/selling-or-disposing-of-shares.aspx"
              target="_blank"
              rel="noreferrer"
            >
              Revenue share rules
            </a>
            {" · "}
            <a
              className="text-[#285c4d] underline"
              href="https://www.revenue.ie/ros-content/ROS-Info-section-text-en.aspx"
              target="_blank"
              rel="noreferrer"
            >
              2026 rate change
            </a>
          </div>
          <div className="rounded-lg border border-[#e4ebe3] p-4 text-sm">
            <h3 className="font-semibold text-[#1d302a]">Qualifying funds / ETFs</h3>
            <p className="mt-2 leading-6 text-[#60716b]">
              Qualifying Irish and equivalent offshore funds are generally in a separate regime: 38%
              for individual chargeable events from 1 January 2026, with an eight-year deemed
              disposal where applicable. Some pre-2022 ETF holdings have a transitional start date.
              Not every ETF has the same treatment. Do not apply the share CGT exemption or losses
              to this category.
            </p>
            <a
              className="mt-2 inline-block text-[#285c4d] underline"
              href="https://www.revenue.ie/en/tax-professionals/ebrief/2026/no-0162026.aspx"
              target="_blank"
              rel="noreferrer"
            >
              Revenue fund rate
            </a>
            {" · "}
            <a
              className="text-[#285c4d] underline"
              href="https://www.revenue.ie/en/tax-professionals/tdm/income-tax-capital-gains-tax-corporation-tax/part-27/27-04-01.pdf"
              target="_blank"
              rel="noreferrer"
            >
              Offshore fund rules
            </a>
          </div>
          <div className="rounded-lg border border-[#e4ebe3] p-4 text-sm">
            <h3 className="font-semibold text-[#1d302a]">Dividends</h3>
            <p className="mt-2 leading-6 text-[#60716b]">
              Usually added to income and subject to Income Tax, USC and potentially PRSI. Irish
              dividend withholding tax is generally 25% and may be creditable. Foreign withholding
              and treaty relief depend on the country.
            </p>
            <a
              className="mt-2 inline-block text-[#285c4d] underline"
              href="https://www.revenue.ie/en/additional-incomes/dividend-income/index.aspx"
              target="_blank"
              rel="noreferrer"
            >
              Revenue dividend guidance
            </a>
          </div>
          <div className="rounded-lg border border-[#e4ebe3] p-4 text-sm">
            <h3 className="font-semibold text-[#1d302a]">Deposit interest</h3>
            <p className="mt-2 leading-6 text-[#60716b]">
              Irish deposit interest generally has 33% DIRT deducted. USC does not apply to deposit
              interest, though PRSI may. Foreign deposit interest needs source-specific review;
              non-EU treatment can differ. Other interest may not be deposit interest.
            </p>
            <a
              className="mt-2 inline-block text-[#285c4d] underline"
              href="https://www.revenue.ie/en/additional-incomes/dirt/index.aspx"
              target="_blank"
              rel="noreferrer"
            >
              Revenue deposit interest guidance
            </a>
          </div>
        </div>
      </section>
      {shareSales.length > 0 ? (
        <section className="card-surface mb-10 p-6 sm:p-8">
          <p className="eyebrow mb-2">2026 ordinary shares</p>
          <h2 className="text-xl font-semibold text-[#1d302a]">Recorded cost-basis matching</h2>
          <p className="mt-2 text-sm leading-6 text-[#60716b]">
            These are draft sale gains or losses from confirmed trades with the same valid ISIN.
            They do not prove the account history is complete, account for all corporate actions,
            determine loss relief, or include your other CGT assets. No tax payable is calculated.
          </p>
          <div className="mt-5 space-y-4">
            {shareSales.map((sale) => (
              <article key={sale.saleId} className="rounded-lg border border-[#e4ebe3] p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#1d302a]">
                      {sale.assetName} · {sale.saleDate}
                    </h3>
                    <p className="mt-1 text-xs text-[#60716b]">
                      {sale.isin ?? "ISIN needed"} · Standard CGT rate for this disposal:{" "}
                      {sale.standardRate === cgt2026.standardRateFromChange ? "31%" : "33%"}
                    </p>
                  </div>
                  <span
                    className={
                      sale.status === "MATCHED"
                        ? "font-semibold text-[#285c4d]"
                        : "font-semibold text-amber-900"
                    }
                  >
                    {sale.status === "MATCHED" ? "Recorded lots matched" : "Review needed"}
                  </span>
                </div>
                {sale.status === "MATCHED" && sale.proceedsEur && sale.costEur && sale.gainEur ? (
                  <div className="mt-3">
                    <p className="text-[#465b52]">
                      Net proceeds {formatEur(sale.proceedsEur)} · Recorded cost{" "}
                      {formatEur(sale.costEur)} · Draft{" "}
                      {sale.gainEur.startsWith("-") ? "loss" : "gain"}{" "}
                      <strong>{formatEur(sale.gainEur)}</strong>
                    </p>
                    {sale.lossRestriction !== "NOT_APPLICABLE" ? (
                      <p className="mt-2 font-medium text-amber-900">
                        {sale.lossRestriction === "KNOWN_REPURCHASE"
                          ? "A repurchase within four weeks is recorded. Loss relief is restricted and needs review."
                          : "Check all purchases in the following four weeks before using this loss."}
                      </p>
                    ) : null}
                    <details className="mt-3 text-xs text-[#60716b]">
                      <summary className="cursor-pointer font-semibold text-[#285c4d]">
                        See matched purchase lots
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {sale.matches.map((match) => (
                          <li key={`${match.purchaseId}-${match.rule}`}>
                            {match.purchaseDate}: {match.quantity} shares,{" "}
                            {formatEur(match.costEur)} cost (
                            {match.rule === "FOUR_WEEK_LIFO" ? "four-week match" : "FIFO"})
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                ) : (
                  <p className="mt-3 text-amber-900">{sale.reason}</p>
                )}
              </article>
            ))}
          </div>
          <a
            href={cgt2026.matchingSource.url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-xs font-semibold text-[#285c4d] underline"
          >
            Revenue share-identification rules
          </a>
        </section>
      ) : null}
      {fundPosition.events.length > 0 ||
      fundPosition.nextAnniversaries.length > 0 ||
      fundPosition.issues.length > 0 ? (
        <section className="card-surface mb-10 p-6 sm:p-8">
          <p className="eyebrow mb-2">Fund / ETF unit history</p>
          <h2 className="text-xl font-semibold text-[#1d302a]">Draft fund event values</h2>
          <p className="mt-2 text-sm leading-6 text-[#60716b]">
            This draft schedule only calculates confirmed equivalent offshore funds with a verified
            FIFO method, valid ISIN, internally consistent recorded trades and EUR values. Irish
            funds and other cost-basis methods stay in review. A matched difference is not tax
            payable: past deemed event tax, fund distributions, withholding, switches and complete
            ownership history still need checking. The 2026 individual rate for qualifying funds is{" "}
            {d(funds2026.equivalentOffshoreIndividualRate).times(100).toString()}%.
          </p>
          {fundPosition.issues.length > 0 ? (
            <div
              role="status"
              className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <p className="font-semibold">
                {fundPosition.issues.length} fund history item(s) need review
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {fundPosition.issues.map((issue, index) => (
                  <li key={`${issue.isin ?? issue.assetName}-${index}`}>
                    {issue.assetName}
                    {issue.isin ? ` · ${issue.isin}` : ""}: {issue.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {fundPosition.events.length > 0 ? (
            <div className="mt-5 space-y-4">
              {fundPosition.events.map((event) => {
                const savedValuation = valuations.find(
                  (row) => row.isin === event.isin && row.valuationDate === event.eventDate,
                );
                return (
                  <article
                    key={event.id}
                    className="rounded-lg border border-[#e4ebe3] p-4 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-[#1d302a]">
                          {event.assetName} · {event.eventDate}
                        </h3>
                        <p className="mt-1 text-xs text-[#60716b]">
                          {event.isin} ·{" "}
                          {event.kind === "SALE" ? "Actual sale" : "Eight-year deemed event"} ·{" "}
                          {event.quantity} units
                        </p>
                      </div>
                      <span
                        className={
                          event.status === "CALCULATED"
                            ? "font-semibold text-[#285c4d]"
                            : "font-semibold text-amber-900"
                        }
                      >
                        {event.status === "CALCULATED"
                          ? "Recorded values matched"
                          : "Valuation needed"}
                      </span>
                    </div>
                    {event.status === "CALCULATED" && event.valueEur && event.differenceEur ? (
                      <p className="mt-3 text-[#465b52]">
                        Recorded value {formatEur(event.valueEur)} · FIFO cost{" "}
                        {formatEur(event.costEur)} · Draft{" "}
                        {event.differenceEur.startsWith("-") ? "loss" : "gain"}{" "}
                        <strong>{formatEur(event.differenceEur)}</strong>
                      </p>
                    ) : (
                      <p className="mt-3 text-amber-900">{event.reason}</p>
                    )}
                    <details className="mt-3 text-xs text-[#60716b]">
                      <summary className="cursor-pointer font-semibold text-[#285c4d]">
                        Purchase lot and
                        {event.kind === "EIGHT_YEAR_DEEMED" ? " valuation" : " basis"}
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {event.matches.map((match) => (
                          <li key={match.purchaseId}>
                            {match.purchaseDate}: {match.quantity} units, {formatEur(match.costEur)}{" "}
                            recorded cost
                          </li>
                        ))}
                      </ul>
                      {event.kind === "EIGHT_YEAR_DEEMED" ? (
                        <form action={saveFundValuation} className="mt-4 grid gap-3 sm:grid-cols-2">
                          <input type="hidden" name="isin" value={event.isin} />
                          <input type="hidden" name="valuationDate" value={event.eventDate} />
                          <label className="grid gap-1.5 font-medium">
                            EUR value per unit on {event.eventDate}
                            <input
                              className="field-input text-sm"
                              name="unitValueEur"
                              inputMode="decimal"
                              defaultValue={savedValuation?.unitValueEur ?? ""}
                              required
                            />
                          </label>
                          <label className="grid gap-1.5 font-medium sm:col-span-2">
                            Statement or valuation evidence
                            <input
                              className="field-input text-sm"
                              name="evidenceNote"
                              defaultValue={savedValuation?.evidenceNote ?? ""}
                              maxLength={500}
                              required
                            />
                          </label>
                          <button className="button-secondary w-fit">Save anniversary value</button>
                        </form>
                      ) : null}
                    </details>
                  </article>
                );
              })}
            </div>
          ) : null}
          {fundPosition.nextAnniversaries.length > 0 ? (
            <div className="mt-6">
              <h3 className="font-semibold text-[#1d302a]">Next anniversaries after 2026</h3>
              <ul className="mt-2 space-y-1 text-sm text-[#60716b]">
                {fundPosition.nextAnniversaries.map((item) => (
                  <li key={item.purchaseId}>
                    {item.dueDate}: {item.assetName} · {item.remainingQuantity} units · {item.isin}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="mt-4 text-xs text-[#60716b]">
            Sources:{" "}
            <a
              href={funds2026.calculationSource.url}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Revenue offshore-fund rules
            </a>
            {" · "}
            <a
              href={funds2026.transitionSource.url}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              ETF transitional rule
            </a>
            .
          </p>
        </section>
      ) : null}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#1d302a]">Recorded events</h2>
            <p className="mt-1 text-sm text-[#60716b]">
              {entries.length} shown · {historicalCount} before 2026 · {reviewCount} need review
            </p>
          </div>
        </div>
        {entries.length === 0 ? (
          <p className="card-surface px-6 py-8 text-sm text-[#60716b]">
            No investment events recorded yet. You can add one above or import a Trading 212 CSV.
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <article key={entry.id} className="card-surface p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#60716b]">
                      {entry.eventDate} · {entry.kind} ·{" "}
                      {entry.source === "MANUAL" ? "Manual" : "Trading 212"}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-[#1d302a]">
                      {entry.assetName}
                      {entry.symbol ? ` · ${entry.symbol}` : ""}
                    </h3>
                    <p className="mt-1 text-sm text-[#60716b]">
                      {entry.grossAmount} {entry.currency}
                      {entry.eurAmount
                        ? ` · ${formatEur(entry.eurAmount)}`
                        : " · EUR conversion needed"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${entry.reviewStatus === "CONFIRMED" ? "bg-[#e2f0e5] text-[#285c4d]" : "bg-amber-50 text-amber-900"}`}
                  >
                    {entry.reviewStatus === "CONFIRMED" ? "Confirmed" : "Review needed"}
                  </span>
                </div>
                <form
                  action={confirmEntry}
                  className="mt-5 grid gap-3 border-t border-[#e4ebe3] pt-5 sm:grid-cols-2 lg:grid-cols-4"
                >
                  <input type="hidden" name="id" value={entry.id} />
                  <label className="grid gap-1.5 text-xs font-medium">
                    ISIN or ticker
                    <input
                      className="field-input text-sm"
                      name="symbol"
                      defaultValue={entry.symbol ?? ""}
                      maxLength={40}
                      placeholder="Use ISIN for share-gain matching"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium">
                    Tax treatment
                    <select
                      className="field-input text-sm"
                      name="classification"
                      defaultValue={entry.classification}
                    >
                      <option value="UNKNOWN">Needs classification</option>
                      <option value="SHARE_CGT">Ordinary share / CGT</option>
                      <option value="FUND_EXIT_TAX_38_2026">Fund regime</option>
                      <option value="UNSUPPORTED">Unsupported</option>
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium">
                    Fund calculation method, if verified
                    <select
                      className="field-input text-sm"
                      name="fundTaxMethod"
                      defaultValue={entry.fundTaxMethod ?? ""}
                    >
                      <option value="">Not verified / Irish fund / other</option>
                      <option value="OFFSHORE_EQUIVALENT_FIFO">
                        Equivalent offshore fund, FIFO
                      </option>
                    </select>
                  </label>
                  {entry.kind === "BUY" ? (
                    <label className="grid gap-1.5 text-xs font-medium">
                      Pre-2022 fund eight-year start date
                      <input
                        className="field-input text-sm"
                        type="date"
                        name="fundDeemedStartDate"
                        defaultValue={entry.fundDeemedStartDate ?? ""}
                        max="2026-12-31"
                      />
                    </label>
                  ) : null}
                  <label className="grid gap-1.5 text-xs font-medium">
                    Gross amount
                    <input
                      className="field-input text-sm"
                      name="grossAmount"
                      defaultValue={entry.grossAmount}
                      inputMode="decimal"
                      required
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium">
                    Fees (original currency)
                    <input
                      className="field-input text-sm"
                      name="feeAmount"
                      defaultValue={entry.feeAmount}
                      inputMode="decimal"
                      required
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium">
                    Tax withheld
                    <input
                      className="field-input text-sm"
                      name="withholdingAmount"
                      defaultValue={entry.withholdingAmount}
                      inputMode="decimal"
                      required
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium">
                    EUR amount
                    <input
                      className="field-input text-sm"
                      name="eurAmount"
                      defaultValue={entry.eurAmount ?? ""}
                      inputMode="decimal"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium">
                    Income jurisdiction
                    <input
                      className="field-input text-sm"
                      name="incomeJurisdiction"
                      defaultValue={entry.incomeJurisdiction ?? ""}
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium">
                    Interest source
                    <input
                      className="field-input text-sm"
                      name="interestSourceType"
                      defaultValue={entry.interestSourceType ?? ""}
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium sm:col-span-2 lg:col-span-4">
                    Notes / treatment evidence (required for fund calculation)
                    <input
                      className="field-input text-sm"
                      name="note"
                      defaultValue={entry.note ?? ""}
                      maxLength={500}
                      placeholder="Why this treatment applies; include a source or statement reference"
                    />
                  </label>
                  <label className="flex items-start gap-2 text-xs text-[#465b52] sm:col-span-2 lg:col-span-4">
                    <input
                      type="checkbox"
                      name="fundMethodConfirmed"
                      className="mt-0.5 size-4 accent-[#285c4d]"
                    />
                    <span>
                      For a fund calculation, I verified equivalent offshore treatment, FIFO basis
                      and any pre-2022 eight-year start date.
                    </span>
                  </label>
                  <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-4">
                    <button className="button-secondary">Save review</button>
                  </div>
                </form>
                <form action={removeEntry} className="mt-3">
                  <input type="hidden" name="id" value={entry.id} />
                  <button className="text-xs font-medium text-red-700 underline underline-offset-2">
                    Remove event
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
