import { addCalendarDays, parseDateInput, toDateInputValue } from "@/lib/date";
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
  lastServiceDate: string;
  nextServiceDueDate: string;
  renewalDueDate: string;
  amcPeriodText: string;
  newAmcPeriodText: string;
  status: "DUE" | "DONE";
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
  lastServiceDate: "",
  nextServiceDueDate: "",
  renewalDueDate: "",
  amcPeriodText: "",
  newAmcPeriodText: "",
  status: "DUE",
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
  lastServiceDate: Date | null;
  nextServiceDueDate: Date | null;
  renewalDueDateOverride: Date | null;
  amcPeriodText: string | null;
  newAmcPeriodText: string | null;
  status: "DUE" | "DONE";
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
    lastServiceDate: toDateInputValue(unit.lastServiceDate),
    nextServiceDueDate: toDateInputValue(unit.nextServiceDueDate),
    renewalDueDate: toDateInputValue(unit.renewalDueDateOverride),
    amcPeriodText: unit.amcPeriodText ?? "",
    newAmcPeriodText: unit.newAmcPeriodText ?? "",
    status: unit.status,
    remarks: unit.remarks ?? "",
  };
}

/**
 * Turn form values into stored columns.
 *
 * The two due dates are deliberately independent. `nextServiceDueDate` (when the next visit is
 * owed) falls back to last service + the project's interval when left blank;
 * `renewalDueDateOverride` (when the contract must be renewed) stays null when blank and falls
 * back to the AMC period end at read time — see resolveRenewalDueDate in lib/status.ts. Neither
 * is ever derived from the other.
 */
export function unitDataFromInput(input: UnitInput, intervalDays: number) {
  const amcPeriod = parseAmcPeriodRange(input.amcPeriodText);
  const newAmcPeriod = parseAmcPeriodRange(input.newAmcPeriodText);
  const lastServiceDate = parseDateInput(input.lastServiceDate);
  const explicitServiceDue = parseDateInput(input.nextServiceDueDate);

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
    status: input.status,
    lastServiceDate,
    nextServiceDueDate:
      explicitServiceDue ?? (lastServiceDate ? addCalendarDays(lastServiceDate, intervalDays) : null),
    renewalDueDateOverride: parseDateInput(input.renewalDueDate),
    amcPeriodText: emptyToNull(input.amcPeriodText),
    amcPeriodStart: amcPeriod.start,
    amcPeriodEnd: amcPeriod.end,
    newAmcPeriodText: emptyToNull(input.newAmcPeriodText),
    newAmcPeriodStart: newAmcPeriod.start,
    newAmcPeriodEnd: newAmcPeriod.end,
  };
}

/** A flat's display label, for lists that reference a flat rather than show its whole row. */
export function unitLabel(unit: { flatNo: string | null; block: string | null; siteName: string | null }): string {
  const location = [unit.block && `Block ${unit.block}`, unit.flatNo && `Flat ${unit.flatNo}`]
    .filter(Boolean)
    .join(" · ");
  if (location && unit.siteName) return `${location} — ${unit.siteName}`;
  return location || unit.siteName || "Unnamed flat";
}
