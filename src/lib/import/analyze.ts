import crypto from "node:crypto";
import type ExcelJS from "exceljs";
import {
  detectHeaderRow,
  matchCanonicalField,
  normalizeHeaderText,
  SERVICE_DATE_HEADER_RE,
  type CanonicalField,
  type HeaderDetectionResult,
} from "./mapping";
import { toStringOrNull } from "./parsers";

export interface ColumnMapping {
  mode: "header" | "positional";
  headerRowIndex: number | null;
  dataStartRowIndex: number;
  fields: Partial<Record<CanonicalField, number>>;
  // Ordered ascending by column index — chronological order in every sheet we've seen matches
  // left-to-right column order, so we don't need a separate manual-reorder UI for this.
  serviceDateColumns: number[];
}

export interface ColumnPreview {
  colNumber: number;
  headerText: string | null;
  samples: string[];
}

// Identifies whether a previously-saved mapping is still valid for a re-uploaded sheet: for
// header-mode sheets this hashes the normalized header row text; for positional/headerless
// sheets (no header row to hash) it falls back to a shape signature (column count of the first
// data row), since that's the only stable signal available.
export function computeHeaderHash(worksheet: ExcelJS.Worksheet, detection: HeaderDetectionResult): string {
  if (detection.mode === "header" && detection.headerRowIndex) {
    const headerRow = worksheet.getRow(detection.headerRowIndex);
    const parts: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell) => parts.push(normalizeHeaderText(cell.value)));
    return crypto.createHash("sha1").update(`header:${parts.join("|")}`).digest("hex");
  }
  const dataRow = worksheet.getRow(detection.dataStartRowIndex);
  return crypto.createHash("sha1").update(`positional:${dataRow.cellCount}`).digest("hex");
}

export function suggestColumnMapping(
  worksheet: ExcelJS.Worksheet,
  detection: HeaderDetectionResult
): ColumnMapping {
  const fields: Partial<Record<CanonicalField, number>> = {};
  const serviceDateColumns: number[] = [];

  if (detection.mode === "header" && detection.headerRowIndex) {
    const headerRow = worksheet.getRow(detection.headerRowIndex);
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const normalized = normalizeHeaderText(cell.value);
      if (!normalized) return;
      const field = matchCanonicalField(normalized);
      if (field) {
        // First match wins — some sheets have duplicate trailing columns with the same header
        // text (e.g. two extra empty "Last service Date" columns after the real one).
        if (fields[field] === undefined) fields[field] = colNumber;
      } else if (SERVICE_DATE_HEADER_RE.test(normalized)) {
        serviceDateColumns.push(colNumber);
      }
    });
  }

  return {
    mode: detection.mode,
    headerRowIndex: detection.headerRowIndex,
    dataStartRowIndex: detection.dataStartRowIndex,
    fields,
    serviceDateColumns,
  };
}

export function buildColumnPreviews(
  worksheet: ExcelJS.Worksheet,
  detection: HeaderDetectionResult,
  maxCols = 26,
  sampleRows = 3
): ColumnPreview[] {
  const previews: ColumnPreview[] = [];
  const headerRow =
    detection.mode === "header" && detection.headerRowIndex
      ? worksheet.getRow(detection.headerRowIndex)
      : null;
  const colCount = Math.min(worksheet.columnCount, maxCols);

  for (let c = 1; c <= colCount; c++) {
    const headerText = headerRow ? toStringOrNull(headerRow.getCell(c).value) : null;
    const samples: string[] = [];
    for (let r = detection.dataStartRowIndex; r <= worksheet.rowCount && samples.length < sampleRows; r++) {
      const v = toStringOrNull(worksheet.getRow(r).getCell(c).value);
      if (v) samples.push(v);
    }
    previews.push({ colNumber: c, headerText, samples });
  }

  return previews;
}

export { detectHeaderRow };
export type { CanonicalField, HeaderDetectionResult };
