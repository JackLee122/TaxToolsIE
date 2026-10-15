import { toDecimalString } from "@/lib/utils/decimal";

export type Trading212Draft = {
  row: number;
  eventDate: string;
  kind: "BUY" | "SELL" | "DIVIDEND" | "INTEREST" | "OTHER";
  assetName: string;
  symbol: string | null;
  quantity: string | null;
  grossAmount: string;
  currency: string;
  externalId: string;
  note: string;
};

function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((part) => part.trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (quoted) throw new Error("CSV has an unfinished quoted field");
  row.push(cell);
  if (row.some((part) => part.trim())) rows.push(row);
  return rows;
}

function date(value: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  const eu = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value.trim());
  const result = iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : eu ? `${eu[3]}-${eu[2]}-${eu[1]}` : null;
  if (!result) return null;
  const parsed = new Date(`${result}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === result
    ? result
    : null;
}

function number(value: string): string | null {
  const trimmed = value.trim().replaceAll(" ", "");
  const plain = /^-?\d{1,3}(,\d{3})+(?:\.\d+)?$/.test(trimmed)
    ? trimmed.replaceAll(",", "")
    : trimmed;
  if (!/^-?\d+(?:\.\d+)?$/.test(plain)) return null;
  return toDecimalString(plain.startsWith("-") ? plain.slice(1) : plain);
}

export function parseTrading212Csv(text: string): { drafts: Trading212Draft[]; errors: string[] } {
  const rows = csvRows(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("CSV is empty");
  const headings = rows[0].map((item) => item.trim().toLowerCase().replace(/\s+/g, " "));
  const column = (...names: string[]) =>
    names.map((name) => headings.indexOf(name)).find((index) => index >= 0) ?? -1;
  const actionCol = column("action");
  const timeCol = column("time", "date");
  const totalCol = column("total", "amount");
  const currencyCol = column("currency (total)", "currency");
  if ([actionCol, timeCol, totalCol, currencyCol].some((index) => index < 0)) {
    throw new Error(
      "This CSV needs Action, Time, Total and Currency (Total) columns. Export Invest account history from Trading 212.",
    );
  }
  const nameCol = column("name", "instrument");
  const isinCol = column("isin");
  const tickerCol = column("ticker");
  const quantityCol = column("no. of shares", "quantity", "shares");
  const idCol = column("id", "transaction id");
  const drafts: Trading212Draft[] = [];
  const errors: string[] = [];
  rows.slice(1).forEach((cells, index) => {
    const field = (position: number) => (position < 0 ? "" : (cells[position] ?? "").trim());
    const action = field(actionCol);
    const eventDate = date(field(timeCol));
    const grossAmount = number(field(totalCol));
    const currency = field(currencyCol).toUpperCase();
    if (!eventDate || eventDate > "2026-12-31" || !grossAmount || !/^[A-Z]{3}$/.test(currency)) {
      errors.push(`Row ${index + 2}: use a 2026 or earlier date and check the amount and currency`);
      return;
    }
    const lower = action.toLowerCase();
    const kind = /\bbuy\b/.test(lower)
      ? "BUY"
      : /\bsell\b/.test(lower)
        ? "SELL"
        : /dividend/.test(lower)
          ? "DIVIDEND"
          : /interest/.test(lower)
            ? "INTEREST"
            : "OTHER";
    const quantity = field(quantityCol) ? number(field(quantityCol)) : null;
    if ((kind === "BUY" || kind === "SELL") && !quantity) {
      errors.push(`Row ${index + 2}: trade quantity is missing`);
      return;
    }
    const symbol = field(isinCol) || field(tickerCol) || null;
    const assetName = field(nameCol) || symbol || action || "Unknown event";
    const externalId =
      field(idCol) ||
      `${field(timeCol)}|${action}|${assetName}|${quantity ?? ""}|${grossAmount}|${currency}`;
    drafts.push({
      row: index + 2,
      eventDate,
      kind,
      assetName,
      symbol,
      quantity,
      grossAmount,
      currency,
      externalId,
      note: action,
    });
  });
  return { drafts, errors };
}
