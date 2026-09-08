import { formatCalendarDate, parseDateInput, toDateInputValue } from "@/lib/date";
import { emptyToNull, parseNumber } from "@/lib/forms";
import { parseAmcPeriodRange } from "@/lib/import/parsers";

// The flat ("unit") form shape and its mapping onto stored columns, in a plain module so the
// client form, the "add flat" action and the "edit flat" action all share one definition rather
// than three drifting copies. Server actions can only export async functions, so this can't
// live in either actions file.

export interface UnitInput {
  block: string;
  flatNo: string;
  siteName: string;
  address: string;
  hp: string;
  type: string;
  through: string;
  billNo: string;
  /** The contract's own start and end. Everything else about scheduling derives from these. */
  amcStartDate: string;
  amcEndDate: string;
  newAmcPeriodText: string;
  remarks: string;
}

export const EMPTY_UNIT_INPUT: UnitInput = {
  block: "",
  flatNo: "",
  siteName: "",
  address: "",
  hp: "",
  type: "",
  through: "",
  billNo: "",
  amcStartDate: "",
  amcEndDate: "",
  newAmcPeriodText: "",
  remarks: "",
};

/** Every stored field the flat form can edit — the source for its initial values. */
export interface UnitRecord {
  block: string | null;
  flatNo: string | null;
  siteName: string | null;
  address: string | null;
  hp: number | null;
  type: string | null;
  through: string | null;
  billNo: string | null;
  amcPeriodStart: Date | null;
  amcPeriodEnd: Date | null;
  newAmcPeriodText: string | null;
  remarks: string | null;
}

export function unitInputFromRecord(unit: UnitRecord): UnitInput {
  return {
    block: unit.block ?? "",
    flatNo: unit.flatNo ?? "",
    siteName: unit.siteName ?? "",
    address: unit.address ?? "",
    hp: unit.hp !== null ? String(unit.hp) : "",
    type: unit.type ?? "",
    through: unit.through ?? "",
    billNo: unit.billNo ?? "",
    amcStartDate: toDateInputValue(unit.amcPeriodStart),
    amcEndDate: toDateInputValue(unit.amcPeriodEnd),
    newAmcPeriodText: unit.newAmcPeriodText ?? "",
    remarks: unit.remarks ?? "",
  };
}

/**
 * Turn form values into stored columns.
 *
 * The form no longer carries the last-service, service-due, renewal-due or status fields: all
 * four are derived rather than typed. Service visits (and therefore the last-service and
 * service-due dates, and the DUE/DONE status) come from the service history; the renewal date is
 * the AMC end date. What a person enters is the contract itself — when it starts and ends.
 */
export function unitDataFromInput(input: UnitInput) {
  const amcPeriodStart = parseDateInput(input.amcStartDate);
  const amcPeriodEnd = parseDateInput(input.amcEndDate);
  const newAmcPeriod = parseAmcPeriodRange(input.newAmcPeriodText);

  return {
    block: emptyToNull(input.block),
    flatNo: emptyToNull(input.flatNo),
    siteName: emptyToNull(input.siteName),
    address: emptyToNull(input.address),
    hp: parseNumber(input.hp),
    type: emptyToNull(input.type),
    through: emptyToNull(input.through),
    billNo: emptyToNull(input.billNo),
    remarks: emptyToNull(input.remarks),
    amcPeriodStart,
    amcPeriodEnd,
    // Kept in step with the two dates so the export and any imported sheet still read the same.
    amcPeriodText: formatAmcPeriodText(amcPeriodStart, amcPeriodEnd),
    newAmcPeriodText: emptyToNull(input.newAmcPeriodText),
    newAmcPeriodStart: newAmcPeriod.start,
    newAmcPeriodEnd: newAmcPeriod.end,
  };
}

/** The "01.02.2025 to 31.01.2026" wording the sheets and the printed offer both use. */
export function formatAmcPeriodText(start: Date | null, end: Date | null): string | null {
  if (!start && !end) return null;
  const from = formatCalendarDate(start, "DD.MM.YYYY") ?? "?";
  const to = formatCalendarDate(end, "DD.MM.YYYY") ?? "?";
  return `${from} to ${to}`;
}

/** A flat's display label, for lists that reference a flat rather than show its whole row. */
export function unitLabel(unit: { flatNo: string | null; block: string | null; siteName: string | null }): string {
  const location = [unit.block && `Block ${unit.block}`, unit.flatNo && `Flat ${unit.flatNo}`]
    .filter(Boolean)
    .join(" · ");
  if (location && unit.siteName) return `${location} — ${unit.siteName}`;
  return location || unit.siteName || "Unnamed flat";
}
