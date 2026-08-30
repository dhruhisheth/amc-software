import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";

dayjs.extend(customParseFormat);
dayjs.extend(utc);

const DATE_FORMATS = [
  "DD.MM.YYYY",
  "DD/MM/YYYY",
  "DD-MM-YYYY",
  "DD.MM.YY",
  "DD/MM/YY",
  "DD-MM-YY",
  "D.M.YYYY",
  "D/M/YYYY",
  "D-M-YYYY",
  "D.M.YY",
  "D/M/YY",
  "D-M-YY",
];

// Matches the first date-like substring in a string, e.g. pulls "10-08-26" out of
// "10-08-26 TO" or "17.06.2023" out of "17.06.2023 (pending)". Deliberately excludes
// trailing garbage rather than trying to interpret it.
const DATE_SUBSTRING_RE = /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/;

function isSaneDate(d: Date): boolean {
  const year = d.getFullYear();
  return !Number.isNaN(d.getTime()) && year >= 1990 && year <= 2100;
}

// Excel's epoch (serial day 0 = 1899-12-30), used only as a fallback for the rare case
// a date cell surfaces as a raw number instead of exceljs already giving us a Date.
function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial <= 0 || serial > 100000) return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return isSaneDate(d) ? d : null;
}

export function parseLenientDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    return isSaneDate(value) ? value : null;
  }

  if (typeof value === "number") {
    return excelSerialToDate(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const match = trimmed.match(DATE_SUBSTRING_RE);
    const candidate = match ? match[0] : trimmed;

    for (const format of DATE_FORMATS) {
      // Parsed in UTC so a text date like "28.12.2024" becomes UTC midnight — the same
      // convention exceljs uses for genuine Excel date cells. Mixing local-midnight (from a
      // naive dayjs() parse) with UTC-midnight (from real date cells) would make the same
      // calendar date compare/display inconsistently depending on which cell type it came from.
      const parsed = dayjs.utc(candidate, format, true);
      if (parsed.isValid()) {
        const d = parsed.toDate();
        if (isSaneDate(d)) return d;
      }
    }
  }

  return null;
}

export interface AmcPeriodRange {
  startText: string | null;
  endText: string | null;
  start: Date | null;
  end: Date | null;
}

// AMC period cells are always two dates joined by "to"/"TO" (e.g. "15/09/2024 TO 14/09/2025",
// or "1-3-2026 TO 28-2-2027" where hyphens are part of each date, not the delimiter) — so we
// split only on the "to" token, never on "-", to avoid breaking hyphenated dates apart.
export function parseAmcPeriodRange(text: string | null | undefined): AmcPeriodRange {
  if (!text || !text.trim()) {
    return { startText: null, endText: null, start: null, end: null };
  }

  const parts = text.split(/\bto\b/i);
  if (parts.length !== 2) {
    return { startText: text.trim(), endText: null, start: parseLenientDate(text), end: null };
  }

  const startText = parts[0].trim();
  const endText = parts[1].trim();

  return {
    startText: startText || null,
    endText: endText || null,
    start: parseLenientDate(startText),
    end: parseLenientDate(endText),
  };
}

// ExcelJS represents some cells as objects rather than primitives: rich text (`{richText: [...]}`),
// formulas (`{formula, result?}`), hyperlinks (`{text, hyperlink}`), and errors (`{error}`). A plain
// `String(value)` on these yields "[object Object]" — seen for real on a corrupted header cell in
// the "Projects" sheet that holds a dangling formula (`+EJ1326`) with no cached result.
function stringifyCellObject(value: object): string | null {
  if ("richText" in value && Array.isArray((value as { richText: unknown }).richText)) {
    const text = (value as { richText: Array<{ text?: string }> }).richText
      .map((run) => run.text ?? "")
      .join("");
    return text.trim() || null;
  }
  if ("result" in value) {
    return toStringOrNull((value as { result: unknown }).result);
  }
  if ("text" in value && typeof (value as { text: unknown }).text === "string") {
    return (value as { text: string }).text.trim() || null;
  }
  // Formula with no cached result, an error cell, or some other unrecognized shape: nothing
  // displayable, so preserve as "unresolvable" rather than stringifying the object shape.
  return null;
}

export function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === "object") return stringifyCellObject(value);
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
