import type ExcelJS from "exceljs";
import type { CanonicalField } from "./fields";

export type { CanonicalField } from "./fields";

// Normalized (lowercased, punctuation-stripped) header text -> canonical field.
// Multiple synonyms map to the same field because header wording differs sheet to sheet.
const HEADER_SYNONYMS: Record<string, CanonicalField> = {
  "sr no": "srNo",
  "srno": "srNo",
  "sr number": "srNo",
  "block": "block",
  "block no": "block",
  "site name": "siteName",
  "contact number with person name": "contactInfo",
  "contact no": "contactInfo",
  "contact number": "contactInfo",
  "hp": "hp",
  "through": "through",
  "type": "type",
  "amc period": "amcPeriodText",
  "amc new period": "newAmcPeriodText",
  "new amc period": "newAmcPeriodText",
  "new period": "newAmcPeriodText",
  "bill no": "billNo",
  "remarks": "remarks",
  "last service date": "lastServiceDate",
  "service time": "status",
};

// Deliberately NOT auto-matched into the mapping: header text for Service Date columns is
// unreliable (two columns in the real "Projects" sheet have corrupted headers, literal `0`
// and `9`, instead of text). This regex only produces a *suggestion* for the admin's ordered
// column picker in the upload wizard — it must never be trusted as the sole source of truth.
export const SERVICE_DATE_HEADER_RE = /^service date\s*\d*$/i;

export function normalizeHeaderText(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  return String(raw)
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchCanonicalField(headerText: string): CanonicalField | null {
  const normalized = normalizeHeaderText(headerText);
  return HEADER_SYNONYMS[normalized] ?? null;
}

export interface HeaderDetectionResult {
  mode: "header" | "positional";
  headerRowIndex: number | null;
  dataStartRowIndex: number;
}

function cellLooksLikeData(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (value instanceof Date) return true;
  if (typeof value === "number") return true;
  if (typeof value === "string") return value.trim().length > 0;
  return false;
}

function cellMatchesHeaderVocabulary(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const normalized = normalizeHeaderText(value);
  if (!normalized) return false;
  return matchCanonicalField(normalized) !== null || SERVICE_DATE_HEADER_RE.test(normalized);
}

// Scans the first few rows for a row where most non-empty cells literally match known header
// vocabulary (column names like "site name", "through", "service date n"), with a data-looking
// row beneath it. Matching on vocabulary rather than "is this cell text" is deliberate: real data
// values (vendor names, contract types, "DUE"/"DONE") are text too, so a naive text-fraction check
// misclassifies a data row as a header — this is exactly what happens on "Sheet1", whose first
// data row is packed with text values and has no header row above it at all.
export function detectHeaderRow(
  worksheet: ExcelJS.Worksheet,
  maxScanRows = 6
): HeaderDetectionResult {
  const scanLimit = Math.min(maxScanRows, worksheet.rowCount);

  for (let rowIndex = 1; rowIndex <= scanLimit; rowIndex++) {
    const row = worksheet.getRow(rowIndex);
    const nextRow = worksheet.getRow(rowIndex + 1);

    const cells: unknown[] = [];
    row.eachCell({ includeEmpty: false }, (cell) => cells.push(cell.value));
    if (cells.length === 0) continue;

    const vocabFraction = cells.filter(cellMatchesHeaderVocabulary).length / cells.length;
    if (vocabFraction < 0.5) continue;

    const nextCells: unknown[] = [];
    nextRow.eachCell({ includeEmpty: false }, (cell) => nextCells.push(cell.value));
    const nextRowLooksLikeData = nextCells.some(cellLooksLikeData);

    if (nextRowLooksLikeData) {
      return { mode: "header", headerRowIndex: rowIndex, dataStartRowIndex: rowIndex + 1 };
    }
  }

  // No header-looking row found (e.g. "Sheet1"): fall back to headerless/positional mode,
  // starting from the first row that has any content at all.
  for (let rowIndex = 1; rowIndex <= scanLimit; rowIndex++) {
    const row = worksheet.getRow(rowIndex);
    if (!isRowBlank(row)) {
      return { mode: "positional", headerRowIndex: null, dataStartRowIndex: rowIndex };
    }
  }

  return { mode: "positional", headerRowIndex: null, dataStartRowIndex: 1 };
}

export function isRowBlank(row: ExcelJS.Row): boolean {
  let hasValue = false;
  row.eachCell({ includeEmpty: false }, (cell) => {
    if (cell.value !== null && cell.value !== undefined && String(cell.value).trim() !== "") {
      hasValue = true;
    }
  });
  return !hasValue;
}
