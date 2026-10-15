"use client";

import { useState } from "react";
import { parseTrading212Csv, type Trading212Draft } from "@/lib/import/trading212";
import { importTrading212Csv } from "./actions";

export function Trading212Upload() {
  const [preview, setPreview] = useState<Trading212Draft[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  async function inspect(file: File | undefined) {
    setPreview([]);
    setErrors([]);
    setConfirmed(false);
    if (!file) return;
    if (file.size > 750_000) {
      setErrors(["CSV must be no larger than 750 KB"]);
      return;
    }
    try {
      const parsed = parseTrading212Csv(await file.text());
      setPreview(parsed.drafts);
      setErrors(parsed.errors);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Could not read CSV"]);
    }
  }
  return (
    <form action={importTrading212Csv} className="card-surface p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-[#1d302a]">Trading 212 CSV</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#60716b]">
        Export Invest account history through 2026 from Trading 212, including older purchases and
        sales that establish cost basis. The CSV is parsed for preview and sent only when you
        confirm import. Raw files are not retained.
      </p>
      <label className="mt-6 grid max-w-md gap-2 text-sm font-medium text-[#314b40]">
        Choose CSV
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          onChange={(event) => void inspect(event.target.files?.[0])}
          className="field-input h-auto file:mr-4 file:rounded-md file:border-0 file:bg-[#edf3ed] file:px-3 file:py-1 file:text-[#285c4d]"
        />
      </label>
      {errors.length > 0 ? (
        <div role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{errors.length} row or format issue(s). Import is paused.</p>
          <ul className="mt-2 list-inside list-disc">
            {errors.slice(0, 5).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {preview.length > 0 ? (
        <div className="mt-6">
          <p className="text-sm font-semibold text-[#1d302a]">Preview: {preview.length} event(s)</p>
          <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-[#dce3dc]">
            <table className="w-full min-w-[35rem] text-left text-xs">
              <thead className="bg-[#edf3ed]">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Asset</th>
                  <th className="px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 20).map((item) => (
                  <tr key={item.row} className="border-t border-[#e4ebe3]">
                    <td className="px-3 py-2">{item.row}</td>
                    <td className="px-3 py-2">{item.eventDate}</td>
                    <td className="px-3 py-2">{item.kind}</td>
                    <td className="px-3 py-2">{item.assetName}</td>
                    <td className="px-3 py-2">
                      {item.grossAmount} {item.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 20 ? (
            <p className="mt-2 text-xs text-[#60716b]">Showing first 20 rows only.</p>
          ) : null}
          <p className="mt-3 text-xs text-[#60716b]">
            All imported entries start in review. Classification, fees, withholding, and historic
            EUR conversion must be checked before tax use.
          </p>
        </div>
      ) : null}
      <label className="mt-5 flex items-start gap-2 text-sm text-[#465b52]">
        <input
          type="checkbox"
          name="confirmed"
          value="yes"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-1 size-4 accent-[#285c4d]"
        />
        <span>I reviewed the preview and understand imported values need confirmation.</span>
      </label>
      <button
        disabled={!confirmed || preview.length === 0 || errors.length > 0 || preview.length > 500}
        className="button-primary mt-5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Import {preview.length || ""} event(s)
      </button>
    </form>
  );
}
