import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import type { EmploymentRecordRow } from "@/lib/db/repositories/employment";
import { getEmployment, getProfile, listEmployment } from "@/lib/supabase/employment";
import { requireUser } from "@/lib/supabase/server";
import { calculateEmploymentTaxSummary } from "@/lib/domain/employment/summary";
import { formatEur } from "@/lib/utils/decimal";
import { createProfile, removeEmployment, saveEmployment } from "./actions";

export const metadata: Metadata = { title: "Employment" };

const taxYear = 2026;
const zero = "0";

type PageProps = {
  searchParams: Promise<{ edit?: string; error?: string }>;
};

function Field({
  label,
  name,
  defaultValue = "",
  required = false,
  type = "text",
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  type?: "text" | "date";
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-[#314b40]">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="field-input font-normal"
      />
      {hint ? <span className="text-xs font-normal leading-5 text-[#60716b]">{hint}</span> : null}
    </label>
  );
}

function EmploymentForm({ record }: { record?: EmploymentRecordRow }) {
  return (
    <form action={saveEmployment} className="card-surface grid gap-7 p-6 sm:p-8">
      <input type="hidden" name="id" value={record?.id ?? ""} />
      <div>
        <p className="eyebrow mb-2">Employment record</p>
        <h2 className="text-xl font-semibold tracking-tight text-[#1d302a]">
          {record ? "Edit employment" : "Add employment"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#60716b]">
          Enter year-to-date figures from Revenue or your final payslip. Amounts are in euro.
        </p>
      </div>
      <div className="border-b border-[#e4ebe3] pb-2 text-xs font-semibold uppercase tracking-wider text-[#60716b]">
        Employer details
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Employer name"
          name="employerName"
          defaultValue={record?.employerName}
          required
        />
        <Field
          label="Employer registration number"
          name="employerRegistrationNumber"
          defaultValue={record?.employerRegistrationNumber}
        />
        <Field label="Start date" name="startDate" type="date" defaultValue={record?.startDate} />
        <Field label="End date" name="endDate" type="date" defaultValue={record?.endDate} />
      </div>
      <div className="border-b border-[#e4ebe3] pb-2 text-xs font-semibold uppercase tracking-wider text-[#60716b]">
        Pay and deductions
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Gross pay" name="grossPay" defaultValue={record?.grossPay ?? zero} required />
        <Field
          label="Pay for Income Tax"
          name="payForIncomeTax"
          defaultValue={record?.payForIncomeTax ?? zero}
          required
        />
        <Field
          label="Pay for USC"
          name="payForUsc"
          defaultValue={record?.payForUsc ?? zero}
          required
        />
        <Field
          label="Income Tax deducted"
          name="incomeTaxDeducted"
          defaultValue={record?.incomeTaxDeducted ?? zero}
          required
        />
        <Field
          label="USC deducted"
          name="uscDeducted"
          defaultValue={record?.uscDeducted ?? zero}
          required
        />
        <Field
          label="PRSI deducted"
          name="prsiDeducted"
          defaultValue={record?.prsiDeducted ?? zero}
          required
        />
        <Field
          label="Payroll-relieved pension contributions"
          name="pensionContributionsPayrollRelieved"
          defaultValue={record?.pensionContributionsPayrollRelieved}
          hint="Already reflected in pay for Income Tax. It is not deducted twice."
        />
        <Field
          label="Other deductions"
          name="otherDeductionAmount"
          defaultValue={record?.otherDeductionAmount}
        />
      </div>
      <div className="flex flex-wrap gap-3 border-t border-[#e4ebe3] pt-6">
        <button className="button-primary">{record ? "Save changes" : "Add employment"}</button>
        {record ? (
          <Link href="/employment" className="button-secondary">
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export default async function EmploymentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const [profile, records, requestedRecord] = await Promise.all([
    getProfile(supabase, userId, taxYear),
    listEmployment(supabase, userId, taxYear),
    params.edit ? getEmployment(supabase, userId, params.edit) : Promise.resolve(undefined),
  ]);
  const record = requestedRecord?.taxYear === taxYear ? requestedRecord : undefined;
  const summary = calculateEmploymentTaxSummary(
    taxYear,
    records,
    profile?.calculationStatus === "SUPPORTED",
  );

  return (
    <main className="app-shell">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">2026 / Records</p>
          <h1 className="page-title">Employment</h1>
          <p className="page-description mt-3">
            Your PAYE income and deductions for the {taxYear} tax year.
          </p>
        </div>
        {profile ? (
          <span className="rounded-full bg-[#e2f0e5] px-3 py-1.5 text-xs font-semibold text-[#285c4d]">
            2026 profile active
          </span>
        ) : null}
      </div>

      {params.error ? (
        <p
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {params.error}
        </p>
      ) : null}

      {!profile ? (
        <>
          <EmptyState
            title="Create your 2026 tax profile"
            description="Answer a few scope questions before entering employment records. Data can still be stored if the current calculation does not cover your situation."
            hint="The current estimate covers a single, Irish-resident and Irish-domiciled PAYE taxpayer without self-employment or rental income."
          />
          <form action={createProfile} className="card-surface mt-5 max-w-2xl space-y-4 p-6">
            <label className="grid gap-2 text-sm font-medium text-[#314b40]">
              Tax residence
              <select name="residenceStatus" className="field-input">
                <option value="IRISH_RESIDENT">Irish resident</option>
                <option value="OTHER">Other / unsure</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-[#314b40]">
              Domicile
              <select name="domicileStatus" className="field-input">
                <option value="IRISH_DOMICILED">Irish domiciled</option>
                <option value="OTHER">Other / unsure</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-[#314b40]">
              Assessment
              <select name="assessmentStatus" className="field-input">
                <option value="SINGLE_INDIVIDUAL">Single, individually assessed</option>
                <option value="UNSUPPORTED">Other / unsure</option>
              </select>
            </label>
            <label className="flex items-start gap-2 text-sm text-[#465b52]">
              <input
                type="checkbox"
                name="mainIncomePaye"
                className="mt-1 size-4 accent-[#285c4d]"
              />
              <span>My main income is PAYE employment</span>
            </label>
            <label className="flex items-start gap-2 text-sm text-[#465b52]">
              <input
                type="checkbox"
                name="hasSelfEmployment"
                className="mt-1 size-4 accent-[#285c4d]"
              />
              <span>I have self-employment income</span>
            </label>
            <label className="flex items-start gap-2 text-sm text-[#465b52]">
              <input
                type="checkbox"
                name="hasRentalIncome"
                className="mt-1 size-4 accent-[#285c4d]"
              />
              <span>I have rental income</span>
            </label>
            <button className="button-primary">Create 2026 profile</button>
          </form>
        </>
      ) : (
        <>
          <section
            aria-label="Employment totals"
            className="card-surface mb-7 grid divide-y divide-[#e4ebe3] px-5 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:px-0"
          >
            {[
              ["Gross pay", summary.totals.grossPay],
              ["Pay for Income Tax", summary.totals.payForIncomeTax],
              ["Income Tax deducted", summary.totals.incomeTaxDeducted],
              ["USC deducted", summary.totals.uscDeducted],
            ].map(([label, amount]) => (
              <div key={label} className="py-5 sm:px-5">
                <p className="metric-label">{label}</p>
                <p className="metric-value mt-1">{formatEur(amount)}</p>
              </div>
            ))}
          </section>
          <EmploymentForm record={record} />
          <section className="mt-10">
            <h2 className="text-xl font-semibold tracking-tight text-[#1d302a]">
              Saved employments
            </h2>
            {records.length === 0 ? (
              <p className="mt-2 text-sm text-[#60716b]">
                No employment records have been entered yet.
              </p>
            ) : (
              <div className="card-surface mt-4 overflow-x-auto">
                <table className="w-full min-w-[42.5rem] text-left text-sm">
                  <thead className="bg-[#edf3ed] text-[#465b52]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Employer</th>
                      <th className="px-4 py-3 font-medium">Gross pay</th>
                      <th className="px-4 py-3 font-medium">Income Tax</th>
                      <th className="px-4 py-3 font-medium">USC</th>
                      <th className="px-4 py-3 font-medium">PRSI</th>
                      <th className="px-4 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((item) => (
                      <tr key={item.id} className="border-t border-[#e4ebe3] text-[#314b40]">
                        <td className="px-4 py-3 font-semibold text-[#1d302a]">
                          {item.employerName}
                        </td>
                        <td className="px-4 py-3">{formatEur(item.grossPay)}</td>
                        <td className="px-4 py-3">{formatEur(item.incomeTaxDeducted)}</td>
                        <td className="px-4 py-3">{formatEur(item.uscDeducted)}</td>
                        <td className="px-4 py-3">{formatEur(item.prsiDeducted)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-3">
                            <Link
                              href={`/employment?edit=${item.id}`}
                              className="font-semibold text-[#285c4d] underline underline-offset-2"
                            >
                              Edit
                            </Link>
                            <form action={removeEmployment}>
                              <input type="hidden" name="id" value={item.id} />
                              <button className="font-medium text-red-700 underline">Delete</button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
