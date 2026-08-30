import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

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
