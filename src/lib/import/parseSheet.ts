import type ExcelJS from "exceljs";
import type { ColumnMapping } from "./analyze";
import { isRowBlank, type CanonicalField } from "./mapping";
import { parseAmcPeriodRange, parseLenientDate, toNumberOrNull, toStringOrNull } from "./parsers";

export interface ParsedServiceVisit {
  sequence: number;
  visitDate: Date | null;
  rawText: string | null;
}

export interface ParsedUnit {
  sourceRowNumber: number;
  srNoRaw: string | null;
  block: string | null;
  flatNo: string | null;
  address: string | null;
  siteName: string | null;
  hp: number | null;
  through: string | null;
  type: string | null;
  amcPeriodText: string | null;
  amcPeriodStart: Date | null;
  amcPeriodEnd: Date | null;
  newAmcPeriodText: string | null;
  newAmcPeriodStart: Date | null;
  newAmcPeriodEnd: Date | null;
  billNo: string | null;
  remarks: string | null;
  status: "DUE" | "DONE";
  lastServiceDateFromColumn: Date | null;
  visits: ParsedServiceVisit[];
}

export interface ParseStats {
  rowsScanned: number;
  rowsSkippedBlank: number;
  unitCount: number;
  totalDateCells: number;
  unparsedDateCells: number;
  totalAmcPeriods: number;
  unparsedAmcPeriods: number;
}

export interface ParseSheetResult {
  units: ParsedUnit[];
  stats: ParseStats;
}

function statusFromRaw(raw: string | null): "DUE" | "DONE" {
  return raw && raw.trim().toUpperCase() === "DONE" ? "DONE" : "DUE";
}

export function parseSheetToUnits(worksheet: ExcelJS.Worksheet, mapping: ColumnMapping): ParseSheetResult {
  const lastRow = worksheet.rowCount;
  const units: ParsedUnit[] = [];
  const stats: ParseStats = {
    rowsScanned: 0,
    rowsSkippedBlank: 0,
    unitCount: 0,
    totalDateCells: 0,
    unparsedDateCells: 0,
    totalAmcPeriods: 0,
    unparsedAmcPeriods: 0,
  };

  for (let rowIndex = mapping.dataStartRowIndex; rowIndex <= lastRow; rowIndex++) {
    const row = worksheet.getRow(rowIndex);
    stats.rowsScanned++;
    if (isRowBlank(row)) {
      stats.rowsSkippedBlank++;
      continue;
    }

    const get = (field: CanonicalField): unknown => {
      const c = mapping.fields[field];
      return c ? row.getCell(c).value : null;
    };

    const amcPeriodText = toStringOrNull(get("amcPeriodText"));
    const amcRange = parseAmcPeriodRange(amcPeriodText);
    if (amcPeriodText) {
      stats.totalAmcPeriods++;
      if (!amcRange.start && !amcRange.end) stats.unparsedAmcPeriods++;
    }

    const newAmcPeriodText = toStringOrNull(get("newAmcPeriodText"));
    const newAmcRange = parseAmcPeriodRange(newAmcPeriodText);
    if (newAmcPeriodText) {
      stats.totalAmcPeriods++;
      if (!newAmcRange.start && !newAmcRange.end) stats.unparsedAmcPeriods++;
    }

    const visits: ParsedServiceVisit[] = [];
    mapping.serviceDateColumns.forEach((c, idx) => {
      const cellValue = row.getCell(c).value;
      const raw = toStringOrNull(cellValue);
      if (raw === null) return;
      stats.totalDateCells++;
      const parsed = parseLenientDate(cellValue);
      if (!parsed) stats.unparsedDateCells++;
      visits.push({ sequence: idx + 1, visitDate: parsed, rawText: raw });
    });

    units.push({
      sourceRowNumber: rowIndex,
      srNoRaw: toStringOrNull(get("srNo")),
      block: toStringOrNull(get("block")),
      flatNo: toStringOrNull(get("flatNo")),
      address: toStringOrNull(get("address")),
      siteName: toStringOrNull(get("siteName")),
      hp: toNumberOrNull(get("hp")),
      through: toStringOrNull(get("through")),
      type: toStringOrNull(get("type")),
      amcPeriodText,
      amcPeriodStart: amcRange.start,
      amcPeriodEnd: amcRange.end,
      newAmcPeriodText,
      newAmcPeriodStart: newAmcRange.start,
      newAmcPeriodEnd: newAmcRange.end,
      billNo: toStringOrNull(get("billNo")),
      remarks: toStringOrNull(get("remarks")),
      status: statusFromRaw(toStringOrNull(get("status"))),
      lastServiceDateFromColumn: parseLenientDate(get("lastServiceDate")),
      visits,
    });
    stats.unitCount++;
  }

  return { units, stats };
}

export function resolveLastServiceDate(unit: ParsedUnit): Date | null {
  const visitDates = unit.visits.map((v) => v.visitDate).filter((d): d is Date => d !== null);
  const candidates = unit.lastServiceDateFromColumn ? [...visitDates, unit.lastServiceDateFromColumn] : visitDates;
  if (candidates.length === 0) return null;
  return new Date(Math.max(...candidates.map((d) => d.getTime())));
}
