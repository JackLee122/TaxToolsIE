"use client";

import { useState } from "react";
import { unemploymentClaimGuidance } from "@/lib/domain/filing/guidance";

type Result = ReturnType<typeof unemploymentClaimGuidance>;

export function UnemploymentCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  return (
    <section className="card-surface p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-[#1d302a]">Unemployment repayment timing</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#60716b]">
        Check the earliest date Revenue generally permits a PAYE and USC unemployment repayment
        claim. This is timing guidance, not an estimated refund.
      </p>
      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setResult(
            unemploymentClaimGuidance({
              employmentEndDate: String(data.get("employmentEndDate")),
              emergencyTaxApplied: data.has("emergencyTaxApplied"),
              leavingIrelandPermanently: data.has("leavingIrelandPermanently"),
              hasOtherTaxableIncome: data.has("hasOtherTaxableIncome"),
              receivesTaxableSocialWelfare: data.has("receivesTaxableSocialWelfare"),
            }),
          );
        }}
      >
        <label className="grid max-w-xs gap-2 text-sm font-medium">
          Employment end date
          <input type="date" name="employmentEndDate" className="field-input" required />
        </label>
        {[
          ["emergencyTaxApplied", "Emergency Tax was applied in my last employment"],
          ["leavingIrelandPermanently", "I am leaving Ireland permanently"],
          ["hasOtherTaxableIncome", "I have other taxable income"],
          ["receivesTaxableSocialWelfare", "I receive taxable social welfare"],
        ].map(([name, label]) => (
          <label key={name} className="flex items-start gap-2 text-sm text-[#465b52]">
            <input type="checkbox" name={name} className="mt-1 size-4 accent-[#285c4d]" />
            <span>{label}</span>
          </label>
        ))}
        <button className="button-secondary">Calculate earliest date</button>
      </form>
      {result ? (
        <div role="status" className="mt-5 rounded-lg bg-[#edf3ed] p-4 text-sm text-[#285c4d]">
          <p className="font-semibold">Earliest guidance date: {result.earliestClaimDate}</p>
          <p className="mt-1">{result.reason}</p>
          <p className="mt-1">{result.revenuePath}</p>
        </div>
      ) : null}
    </section>
  );
}
