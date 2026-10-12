import type { Metadata } from "next";
import { addClaim, removeClaim } from "./actions";
import { listCreditClaims, type CreditClaim } from "@/lib/supabase/credits";
import { requireUser } from "@/lib/supabase/server";
import { formatEur } from "@/lib/utils/decimal";

export const metadata: Metadata = {
  title: "Tax credits",
};

const names: Record<CreditClaim["type"], string> = {
  RENT_TAX_CREDIT: "Rent Tax Credit",
  HEALTH_EXPENSE_RELIEF: "Health expenses",
  TUITION_FEE_RELIEF: "Tuition fees",
  PENSION_RELIEF: "Pension contribution",
  FLAT_RATE_EXPENSE: "Flat-rate expenses",
};

type ClaimFormProps = {
  type: CreditClaim["type"];
  title: string;
  description: string;
  amountLabel: string;
  secondaryLabel?: string;
  checks?: { name: string; label: string }[];
  source: string;
};

function ClaimForm({
  type,
  title,
  description,
  amountLabel,
  secondaryLabel,
  checks = [],
  source,
}: ClaimFormProps) {
  return (
    <section className="card-surface p-6 sm:p-7">
      <h2 className="text-lg font-semibold text-[#1d302a]">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-[#60716b]">{description}</p>
      <form action={addClaim} className="mt-5 space-y-4">
        <input type="hidden" name="type" value={type} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-[#314b40]">
            {amountLabel}
            <input
              className="field-input"
              name="inputAmount"
              inputMode="decimal"
              defaultValue="0"
              required
            />
          </label>
          {secondaryLabel ? (
            <label className="grid gap-2 text-sm font-medium text-[#314b40]">
              {secondaryLabel}
              <input
                className="field-input"
                name="secondaryAmount"
                inputMode="decimal"
                defaultValue="0"
                required
              />
            </label>
          ) : (
            <input type="hidden" name="secondaryAmount" value="0" />
          )}
        </div>
        {checks.map((check) => (
          <label key={check.name} className="flex items-start gap-2 text-sm text-[#465b52]">
            <input type="checkbox" name={check.name} className="mt-1 size-4 accent-[#285c4d]" />
            <span>{check.label}</span>
          </label>
        ))}
        <label className="flex items-start gap-2 text-sm text-[#465b52]">
          <input type="checkbox" name="alreadyClaimed" className="mt-1 size-4 accent-[#285c4d]" />
          <span>I already claimed this with Revenue</span>
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#314b40]">
          Evidence or reference (optional)
          <input
            className="field-input"
            name="evidenceNote"
            maxLength={500}
            placeholder="Receipt, Revenue reference or note"
          />
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <button className="button-primary">Add claim</button>
          <a
            href={source}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-[#285c4d] underline underline-offset-4"
          >
            Revenue guidance
          </a>
        </div>
      </form>
    </section>
  );
}

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { supabase, userId } = await requireUser();
  const [claims, params] = await Promise.all([
    listCreditClaims(supabase, userId, 2026),
    searchParams,
  ]);
  return (
    <main className="app-shell">
      <p className="eyebrow mb-3">2026 / Reliefs</p>
      <h1 className="page-title">Tax credits</h1>
      <p className="page-description mb-9 mt-3">
        Record potential reliefs and see a cautious estimate where the eligibility checks are
        supported.
      </p>
      {params.saved ? (
        <p role="status" className="mb-6 rounded-lg bg-[#e2f0e5] px-4 py-3 text-sm text-[#285c4d]">
          Claim saved.
        </p>
      ) : null}
      {params.error ? (
        <p role="alert" className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {params.error}
        </p>
      ) : null}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-[#1d302a]">Your recorded claims</h2>
        {claims.length === 0 ? (
          <p className="mt-2 text-sm text-[#60716b]">No claims entered yet.</p>
        ) : (
          <div className="card-surface mt-4 divide-y divide-[#e4ebe3]">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <p className="font-semibold text-[#1d302a]">{names[claim.type]}</p>
                  <p className="mt-1 text-xs text-[#60716b]">
                    Entered {formatEur(claim.inputAmount)} ·{" "}
                    {claim.status === "USER_CONFIRMED"
                      ? "Confirmed inputs"
                      : claim.status === "ALREADY_CLAIMED"
                        ? "Already claimed"
                        : "Review needed"}
                  </p>
                  {claim.evidenceNote ? (
                    <p className="mt-1 text-xs text-[#60716b]">{claim.evidenceNote}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-5">
                  <span className="text-sm font-semibold text-[#285c4d]">
                    {claim.status === "USER_CONFIRMED"
                      ? formatEur(claim.estimatedTaxValue)
                      : "Not in estimate"}
                  </span>
                  <form action={removeClaim}>
                    <input type="hidden" name="id" value={claim.id} />
                    <button className="text-xs font-medium text-red-700 underline underline-offset-2">
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <div className="space-y-5">
        <ClaimForm
          type="RENT_TAX_CREDIT"
          title="Rent"
          description="The 2026 single-person credit is capped at €1,000. Exclude utilities and services from the rent figure."
          amountLabel="Rent paid (€)"
          secondaryLabel="Utilities and services included (€)"
          checks={[
            {
              name: "eligibleUse",
              label: "The property was used as my home or another qualifying use",
            },
            { name: "unrelatedLandlord", label: "My landlord is not a disqualifying relative" },
            { name: "tenancy", label: "I paid under a qualifying tenancy" },
            {
              name: "noHousingSupport",
              label: "I did not receive qualifying housing support such as HAP",
            },
          ]}
          source="https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/land-and-property/rent-credit/index.aspx"
        />
        <ClaimForm
          type="HEALTH_EXPENSE_RELIEF"
          title="Health expenses"
          description="Generally 20% of qualifying costs that were not reimbursed. Nursing home expenses need a separate calculation."
          amountLabel="Expenses paid (€)"
          secondaryLabel="Reimbursements (€)"
          checks={[
            {
              name: "qualifyingExpense",
              label: "These are qualifying non-nursing-home expenses that I paid",
            },
          ]}
          source="https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/health-and-age/health-expenses/index.aspx"
        />
        <ClaimForm
          type="TUITION_FEE_RELIEF"
          title="Third-level tuition"
          description="For a single approved full-time course, relief is 20% after the €3,000 annual disregard, subject to the €7,000 fee cap."
          amountLabel="Qualifying fees paid (€)"
          checks={[
            {
              name: "approvedFullTime",
              label: "This is an approved full-time course at an approved college",
            },
            {
              name: "feesPaidByMe",
              label: "I personally paid these fees and excluded non-qualifying levies",
            },
          ]}
          source="https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/education/tuition-fees-paid-for-third-level-education/index.aspx"
        />
        <ClaimForm
          type="PENSION_RELIEF"
          title="Pension contributions"
          description="Record contributions not already relieved through payroll. This is an income deduction, not a tax credit, and remains for review."
          amountLabel="Employee contributions (€)"
          secondaryLabel="Relevant earnings (€)"
          checks={[
            { name: "alreadyRelieved", label: "This amount was already relieved through payroll" },
          ]}
          source="https://www.revenue.ie/en/jobs-and-pensions/pension/relief/how-to-claim.aspx"
        />
        <ClaimForm
          type="FLAT_RATE_EXPENSE"
          title="Flat-rate expenses"
          description="Enter only a Revenue-confirmed allowance for your occupation. This stays under review until the occupation-specific rule is supported."
          amountLabel="Revenue-confirmed annual allowance (€)"
          source="https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/income-and-employment/flat-rate-expenses/index.aspx"
        />
      </div>
    </main>
  );
}
