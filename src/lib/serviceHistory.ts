import type { VisitStatus } from "@/generated/prisma/enums";

// "History show how much service done or pending on which date" — this module turns a flat's
// visit rows into that summary, so the unit page, the project history view and the export all
// count things the same way instead of each re-deriving it.

export interface VisitLike {
  sequence: number;
  status: VisitStatus;
  visitDate: Date | null;
  scheduledDate: Date | null;
  rawText: string | null;
  technician?: { id: string; name: string } | null;
  notes?: string | null;
}

export interface HistoryEntry {
  sequence: number;
  status: VisitStatus;
  /** The date this entry is reported against: when it happened (DONE) or is due (PENDING). */
  date: Date | null;
  rawText: string | null;
  technicianName: string | null;
  notes: string | null;
  /** True when the entry is PENDING and its scheduled date has already passed. */
  overdue: boolean;
}

export interface ServiceHistorySummary {
  entries: HistoryEntry[];
  doneCount: number;
  pendingCount: number;
  overduePendingCount: number;
  lastDoneDate: Date | null;
  nextPendingDate: Date | null;
}

/** The date a visit is reported against — the day it happened, or the day it is owed. */
export function visitDateFor(visit: VisitLike): Date | null {
  return visit.status === "DONE" ? visit.visitDate : (visit.scheduledDate ?? visit.visitDate);
}

export function summarizeServiceHistory(
  visits: VisitLike[],
  now: Date = new Date()
): ServiceHistorySummary {
  const entries: HistoryEntry[] = visits
    .map((visit) => {
      const date = visitDateFor(visit);
      return {
        sequence: visit.sequence,
        status: visit.status,
        date,
        rawText: visit.rawText,
        technicianName: visit.technician?.name ?? null,
        notes: visit.notes ?? null,
        overdue: visit.status === "PENDING" && date !== null && date.getTime() < now.getTime(),
      };
    })
    .sort((a, b) => a.sequence - b.sequence);

  const done = entries.filter((e) => e.status === "DONE");
  const pending = entries.filter((e) => e.status === "PENDING");

  const doneDates = done.map((e) => e.date).filter((d): d is Date => d !== null);
  const pendingDates = pending.map((e) => e.date).filter((d): d is Date => d !== null);

  return {
    entries,
    doneCount: done.length,
    pendingCount: pending.length,
    overduePendingCount: pending.filter((e) => e.overdue).length,
    lastDoneDate: doneDates.length ? new Date(Math.max(...doneDates.map((d) => d.getTime()))) : null,
    nextPendingDate: pendingDates.length
      ? new Date(Math.min(...pendingDates.map((d) => d.getTime())))
      : null,
  };
}

/**
 * The first `count` service dates for a flat, in sequence order, padded with nulls.
 * Backs the fixed "Service Date 1-4" columns on the project (main) table — an AMC year on the
 * default 90-day interval is four visits, so four slots show a whole contract year at a glance.
 */
export const PROJECT_TABLE_SERVICE_SLOTS = 4;

export function serviceDateSlots(visits: VisitLike[], count = PROJECT_TABLE_SERVICE_SLOTS) {
  const ordered = [...visits].sort((a, b) => a.sequence - b.sequence);
  return Array.from({ length: count }, (_, i) => {
    const visit = ordered[i];
    if (!visit) return null;
    return { date: visitDateFor(visit), status: visit.status, rawText: visit.rawText };
  });
}
