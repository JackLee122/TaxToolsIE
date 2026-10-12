import type { Metadata } from "next";
import { addEntry, confirmEntry, removeEntry } from "./actions";
import { listInvestmentEntries } from "@/lib/supabase/investments";
import { requireUser } from "@/lib/supabase/server";
import { formatEur } from "@/lib/utils/decimal";

export const metadata: Metadata = {
  title: "Investments",
};

export default async function InvestmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { supabase, userId } = await requireUser();
  const [entries, params] = await Promise.all([
    listInvestmentEntries(supabase, userId),
    searchParams,
  ]);
  const reviewCount = entries.filter((entry) => entry.reviewStatus === "REQUIRES_REVIEW").length;
  return (
    <main className="app-shell">
      <p className="eyebrow mb-3">2026 / Records</p>
      <h1 className="page-title">Investments</h1>
      <p className="page-description mb-9 mt-3">
        Record 2026 trades and income, then confirm classifications and event-date euro amounts.
        Confirmed income informs provisional filing guidance. CGT and fund-tax calculations are not
        available yet.
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
          event-date conversion.
        </p>
        <form action={addEntry} className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium">
              Date
              <input className="field-input" type="date" name="eventDate" required />
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
              Symbol / ISIN
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
              Fees
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
            Notes (optional)
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
              automatically.
            </span>
          </label>
          <button className="button-primary">Add event</button>
        </form>
      </section>
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#1d302a]">Recorded events</h2>
            <p className="mt-1 text-sm text-[#60716b]">
              {entries.length} shown · {reviewCount} need review
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
                    Fees
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
