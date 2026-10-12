import type { SupabaseClient } from "@supabase/supabase-js";
import type { Trading212Draft } from "@/lib/import/trading212";

export type InvestmentEntry = {
  id: string;
  taxYear: number;
  eventDate: string;
  kind: "BUY" | "SELL" | "DIVIDEND" | "INTEREST" | "OTHER";
  assetName: string;
  symbol: string | null;
  classification: "SHARE_CGT" | "FUND_EXIT_TAX_38_2026" | "UNKNOWN" | "UNSUPPORTED";
  quantity: string | null;
  grossAmount: string;
  feeAmount: string;
  withholdingAmount: string;
  currency: string;
  eurAmount: string | null;
  incomeJurisdiction: string | null;
  interestSourceType: string | null;
  source: "MANUAL" | "TRADING_212_CSV";
  externalId: string | null;
  importBatchId: string | null;
  reviewStatus: "CONFIRMED" | "REQUIRES_REVIEW";
  note: string | null;
};

type Row = {
  id: string;
  tax_year: number;
  event_date: string;
  kind: InvestmentEntry["kind"];
  asset_name: string;
  symbol: string | null;
  classification: InvestmentEntry["classification"];
  quantity: string | null;
  gross_amount: string;
  fee_amount: string;
  withholding_amount: string;
  currency: string;
  eur_amount: string | null;
  income_jurisdiction: string | null;
  interest_source_type: string | null;
  source: InvestmentEntry["source"];
  external_id: string | null;
  import_batch_id: string | null;
  review_status: InvestmentEntry["reviewStatus"];
  note: string | null;
};

function fromRow(row: Row): InvestmentEntry {
  return {
    id: row.id,
    taxYear: row.tax_year,
    eventDate: row.event_date,
    kind: row.kind,
    assetName: row.asset_name,
    symbol: row.symbol,
    classification: row.classification,
    quantity: row.quantity,
    grossAmount: row.gross_amount,
    feeAmount: row.fee_amount,
    withholdingAmount: row.withholding_amount,
    currency: row.currency,
    eurAmount: row.eur_amount,
    incomeJurisdiction: row.income_jurisdiction,
    interestSourceType: row.interest_source_type,
    source: row.source,
    externalId: row.external_id,
    importBatchId: row.import_batch_id,
    reviewStatus: row.review_status,
    note: row.note,
  };
}

export async function listInvestmentEntries(
  supabase: SupabaseClient,
  userId: string,
  taxYear?: number,
): Promise<InvestmentEntry[]> {
  const entries: InvestmentEntry[] = [];
  for (let offset = 0; offset < 10_000; offset += 500) {
    let query = supabase.from("investment_entry").select("*").eq("user_id", userId);
    if (taxYear) query = query.eq("tax_year", taxYear);
    const { data, error } = await query
      .order("event_date", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error("Could not load investment entries");
    entries.push(...(data as Row[]).map(fromRow));
    if (data.length < 500) return entries;
  }
  throw new Error("Too many investment entries to display safely");
}

export async function countInvestmentEntries(
  supabase: SupabaseClient,
  userId: string,
  taxYear: number,
): Promise<number> {
  const { count, error } = await supabase
    .from("investment_entry")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .eq("tax_year", taxYear);
  if (error) throw new Error("Could not count investment entries");
  return count ?? 0;
}

export async function getInvestmentEntry(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<InvestmentEntry | undefined> {
  const { data, error } = await supabase
    .from("investment_entry")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load investment entry");
  return data ? fromRow(data as Row) : undefined;
}

export async function addInvestmentEntry(
  supabase: SupabaseClient,
  userId: string,
  entry: Omit<InvestmentEntry, "id">,
) {
  const { error } = await supabase.from("investment_entry").insert({
    id: crypto.randomUUID(),
    user_id: userId,
    tax_year: entry.taxYear,
    event_date: entry.eventDate,
    kind: entry.kind,
    asset_name: entry.assetName,
    symbol: entry.symbol,
    classification: entry.classification,
    quantity: entry.quantity,
    gross_amount: entry.grossAmount,
    fee_amount: entry.feeAmount,
    withholding_amount: entry.withholdingAmount,
    currency: entry.currency,
    eur_amount: entry.eurAmount,
    income_jurisdiction: entry.incomeJurisdiction,
    interest_source_type: entry.interestSourceType,
    source: entry.source,
    external_id: entry.externalId,
    import_batch_id: entry.importBatchId,
    review_status: entry.reviewStatus,
    note: entry.note,
  });
  if (error) throw new Error("Could not save investment entry");
}

export async function updateInvestmentReview(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  value: Pick<
    InvestmentEntry,
    | "classification"
    | "grossAmount"
    | "feeAmount"
    | "withholdingAmount"
    | "eurAmount"
    | "incomeJurisdiction"
    | "interestSourceType"
    | "reviewStatus"
  >,
) {
  const { data, error } = await supabase
    .from("investment_entry")
    .update({
      classification: value.classification,
      gross_amount: value.grossAmount,
      fee_amount: value.feeAmount,
      withholding_amount: value.withholdingAmount,
      eur_amount: value.eurAmount,
      income_jurisdiction: value.incomeJurisdiction,
      interest_source_type: value.interestSourceType,
      review_status: value.reviewStatus,
    })
    .eq("user_id", userId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Could not update investment entry");
}

export async function deleteInvestmentEntry(supabase: SupabaseClient, userId: string, id: string) {
  const { error } = await supabase
    .from("investment_entry")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error("Could not delete investment entry");
}

export type ImportBatch = {
  id: string;
  source: string;
  fileName: string;
  createdAt: string;
  importedCount: number;
  duplicateCount: number;
  reviewCount: number;
  errorCount: number;
};

export async function listImportBatches(
  supabase: SupabaseClient,
  userId: string,
): Promise<ImportBatch[]> {
  const { data, error } = await supabase
    .from("import_batch")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error("Could not load import history");
  return (
    data as {
      id: string;
      source: string;
      file_name: string;
      created_at: string;
      imported_count: number;
      duplicate_count: number;
      review_count: number;
      error_count: number;
    }[]
  ).map((row) => ({
    id: row.id,
    source: row.source,
    fileName: row.file_name,
    createdAt: row.created_at,
    importedCount: row.imported_count,
    duplicateCount: row.duplicate_count,
    reviewCount: row.review_count,
    errorCount: row.error_count,
  }));
}

export async function importTrading212Drafts(
  supabase: SupabaseClient,
  userId: string,
  fileName: string,
  drafts: Trading212Draft[],
) {
  const existing = new Set<string>();
  for (let start = 0; start < drafts.length; start += 50) {
    const ids = drafts.slice(start, start + 50).map((item) => item.externalId);
    const { data, error } = await supabase
      .from("investment_entry")
      .select("external_id")
      .eq("user_id", userId)
      .eq("source", "TRADING_212_CSV")
      .in("external_id", ids);
    if (error) throw new Error("Could not check existing import entries");
    for (const row of data) if (row.external_id) existing.add(row.external_id);
  }
  const unique = new Map<string, Trading212Draft>();
  for (const item of drafts) if (!existing.has(item.externalId)) unique.set(item.externalId, item);
  const newEntries = [...unique.values()];
  const batchId = crypto.randomUUID();
  const { error: batchError } = await supabase.from("import_batch").insert({
    id: batchId,
    user_id: userId,
    source: "TRADING_212_CSV",
    file_name: fileName,
    imported_count: 0,
    duplicate_count: 0,
    review_count: 0,
    error_count: 0,
  });
  if (batchError) throw new Error("Could not create import batch");
  if (newEntries.length > 0) {
    const { error } = await supabase.from("investment_entry").insert(
      newEntries.map((item) => ({
        id: crypto.randomUUID(),
        user_id: userId,
        tax_year: Number(item.eventDate.slice(0, 4)),
        event_date: item.eventDate,
        kind: item.kind,
        asset_name: item.assetName,
        symbol: item.symbol,
        classification: "UNKNOWN",
        quantity: item.quantity,
        gross_amount: item.grossAmount,
        fee_amount: "0",
        withholding_amount: "0",
        currency: item.currency,
        eur_amount: item.currency === "EUR" ? item.grossAmount : null,
        income_jurisdiction: null,
        interest_source_type: null,
        source: "TRADING_212_CSV",
        external_id: item.externalId,
        import_batch_id: batchId,
        review_status: "REQUIRES_REVIEW",
        note: item.note,
      })),
    );
    if (error) {
      await supabase
        .from("import_batch")
        .update({ error_count: newEntries.length })
        .eq("id", batchId)
        .eq("user_id", userId);
      throw new Error("Could not import CSV entries");
    }
  }
  const duplicateCount = drafts.length - newEntries.length;
  const { error: summaryError } = await supabase
    .from("import_batch")
    .update({
      imported_count: newEntries.length,
      duplicate_count: duplicateCount,
      review_count: newEntries.length,
    })
    .eq("id", batchId)
    .eq("user_id", userId);
  if (summaryError) throw new Error("Import succeeded, but could not update its summary");
  return { importedCount: newEntries.length, duplicateCount, reviewCount: newEntries.length };
}
