import type { SupabaseClient } from "@supabase/supabase-js";

export type CreditClaim = {
  id: string;
  taxYear: number;
  type:
    | "RENT_TAX_CREDIT"
    | "HEALTH_EXPENSE_RELIEF"
    | "TUITION_FEE_RELIEF"
    | "PENSION_RELIEF"
    | "FLAT_RATE_EXPENSE";
  inputAmount: string;
  eligibleAmount: string;
  estimatedTaxValue: string;
  status: "USER_CONFIRMED" | "POTENTIALLY_ELIGIBLE" | "ALREADY_CLAIMED";
  evidenceNote: string | null;
  details: Record<string, unknown>;
};

type Row = {
  id: string;
  tax_year: number;
  type: CreditClaim["type"];
  input_amount: string;
  eligible_amount: string;
  estimated_tax_value: string;
  status: CreditClaim["status"];
  evidence_note: string | null;
  details: Record<string, unknown>;
};

export async function listCreditClaims(
  supabase: SupabaseClient,
  userId: string,
  taxYear: number,
): Promise<CreditClaim[]> {
  const claims: CreditClaim[] = [];
  for (let offset = 0; offset < 10_000; offset += 500) {
    const { data, error } = await supabase
      .from("credit_claim")
      .select("*")
      .eq("user_id", userId)
      .eq("tax_year", taxYear)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error("Could not load credit claims");
    claims.push(
      ...(data as Row[]).map((row) => ({
        id: row.id,
        taxYear: row.tax_year,
        type: row.type,
        inputAmount: row.input_amount,
        eligibleAmount: row.eligible_amount,
        estimatedTaxValue: row.estimated_tax_value,
        status: row.status,
        evidenceNote: row.evidence_note,
        details: row.details,
      })),
    );
    if (data.length < 500) return claims;
  }
  throw new Error("Too many credit claims to display safely");
}

export async function addCreditClaim(
  supabase: SupabaseClient,
  userId: string,
  claim: Omit<CreditClaim, "id">,
) {
  const { error } = await supabase.from("credit_claim").insert({
    id: crypto.randomUUID(),
    user_id: userId,
    tax_year: claim.taxYear,
    type: claim.type,
    input_amount: claim.inputAmount,
    eligible_amount: claim.eligibleAmount,
    estimated_tax_value: claim.estimatedTaxValue,
    status: claim.status,
    evidence_note: claim.evidenceNote,
    details: claim.details,
  });
  if (error) throw new Error("Could not save credit claim");
}

export async function deleteCreditClaim(supabase: SupabaseClient, userId: string, id: string) {
  const { error } = await supabase.from("credit_claim").delete().eq("user_id", userId).eq("id", id);
  if (error) throw new Error("Could not delete credit claim");
}
