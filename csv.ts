export type CsvCell = string | number | boolean | null | undefined | Date;

/**
 * RFC 4180 CSV with spreadsheet formula-injection protection: any text cell
 * starting with = + - @ tab or carriage return is prefixed with an apostrophe
 * so Excel/Sheets treat it as text (a team could be named "=HYPERLINK(...)").
 */
export function toCsv(rows: readonly (readonly CsvCell[])[]): string {
  return rows.map((row) => row.map(formatCell).join(",")).join("\r\n") + "\r\n";
}

export function formatCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}
