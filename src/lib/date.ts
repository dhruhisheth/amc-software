import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(utc);
dayjs.extend(customParseFormat);

// AMC/service dates are pure calendar dates with no meaningful time-of-day — they're stored as
// UTC-midnight instants (the same convention exceljs uses for genuine Excel date cells, and what
// src/lib/import/parsers.ts now normalizes text-parsed dates to as well). Always format and do
// day-arithmetic on them in UTC mode, so the calendar day shown/computed matches the day that was
// actually recorded, regardless of the server or viewer's local timezone. Real timestamps (e.g.
// UploadLog.uploadedAt, which has genuine time-of-day meaning) should NOT use these — format
// those with plain local dayjs instead.
export function formatCalendarDate(date: Date | null | undefined, fmt = "DD MMM YYYY"): string | null {
  if (!date) return null;
  return dayjs.utc(date).format(fmt);
}

export function addCalendarDays(date: Date, days: number): Date {
  return dayjs.utc(date).add(days, "day").toDate();
}

export function todayUtcMidnight(): Date {
  return dayjs.utc().startOf("day").toDate();
}

// Parses the `YYYY-MM-DD` value an <input type="date"> produces into the same UTC-midnight
// instant convention everything else here uses. Returns null for blank/invalid input so form
// fields can be cleared.
export function parseDateInput(value: string | null | undefined): Date | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const parsed = dayjs.utc(trimmed, "YYYY-MM-DD", true);
  return parsed.isValid() ? parsed.startOf("day").toDate() : null;
}

/** Formats a stored date back into the `YYYY-MM-DD` an <input type="date"> expects. */
export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return dayjs.utc(date).format("YYYY-MM-DD");
}
