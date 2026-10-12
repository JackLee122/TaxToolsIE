"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseTrading212Csv } from "@/lib/import/trading212";
import { importTrading212Drafts } from "@/lib/supabase/investments";
import { requireUser } from "@/lib/supabase/server";

function fail(message: string): never {
  redirect(`/imports?error=${encodeURIComponent(message)}`);
}

export async function importTrading212Csv(formData: FormData): Promise<void> {
  if (formData.get("confirmed") !== "yes") fail("Review the preview and confirm before importing");
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv"))
    fail("Choose a Trading 212 CSV file");
  if (file.size === 0 || file.size > 750_000) fail("CSV must be between 1 byte and 750 KB");
  let parsed;
  try {
    parsed = parseTrading212Csv(await file.text());
  } catch (error) {
    fail(error instanceof Error ? error.message : "Could not parse CSV");
  }
  if (parsed.errors.length > 0) fail(`Import stopped: ${parsed.errors[0]}`);
  if (parsed.drafts.length === 0 || parsed.drafts.length > 500)
    fail("CSV must contain between 1 and 500 supported rows");
  const { supabase, userId } = await requireUser();
  const result = await importTrading212Drafts(
    supabase,
    userId,
    file.name.slice(0, 200),
    parsed.drafts,
  );
  revalidatePath("/imports");
  revalidatePath("/investments");
  revalidatePath("/dashboard");
  revalidatePath("/filing");
  redirect(`/imports?imported=${result.importedCount}&duplicates=${result.duplicateCount}`);
}
