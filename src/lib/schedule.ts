import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import type { Prisma } from "@/generated/prisma/client";

dayjs.extend(utc);

/**
 * A comprehensive AMC covers "four services in one year" — one every three months — so the
 * schedule is derived from the contract's start date rather than entered by hand.
 */
export const SERVICES_PER_YEAR = 4;
export const SERVICE_INTERVAL_MONTHS = 3;

/** The four service dates for a contract starting on `amcStart`: months 0, 3, 6 and 9. */
export function quarterlyServiceDates(amcStart: Date): Date[] {
  const start = dayjs.utc(amcStart).startOf("day");
  return Array.from({ length: SERVICES_PER_YEAR }, (_, i) =>
    start.add(i * SERVICE_INTERVAL_MONTHS, "month").toDate()
  );
}

function sameDay(a: Date | null, b: Date): boolean {
  return a !== null && dayjs.utc(a).isSame(dayjs.utc(b), "day");
}

/**
 * Bring a flat's pending service visits in line with its AMC dates.
 *
 * Visits already carried out are never touched. A pending visit is only removed when nothing has
 * been recorded against it — no technician, no notes — so a scheduled visit someone has already
 * assigned survives a change to the contract dates and is reported as a stray instead.
 *
 * Runs inside the caller's transaction so a flat is never left half-scheduled.
 */
export async function syncQuarterlyVisits(
  tx: Prisma.TransactionClient,
  unitId: string,
  amcStart: Date | null
): Promise<void> {
  const existing = await tx.serviceVisit.findMany({ where: { unitId } });

  if (!amcStart) {
    // No contract start means no schedule to derive; clear untouched pending visits only.
    const strays = existing.filter(
      (v) => v.status === "PENDING" && !v.technicianId && !v.notes
    );
    if (strays.length > 0) {
      await tx.serviceVisit.deleteMany({ where: { id: { in: strays.map((v) => v.id) } } });
    }
    return;
  }

  const targets = quarterlyServiceDates(amcStart);

  const obsolete = existing.filter(
    (v) =>
      v.status === "PENDING" &&
      !v.technicianId &&
      !v.notes &&
      !targets.some((t) => sameDay(v.scheduledDate, t))
  );
  if (obsolete.length > 0) {
    await tx.serviceVisit.deleteMany({ where: { id: { in: obsolete.map((v) => v.id) } } });
  }

  const kept = existing.filter((v) => !obsolete.some((o) => o.id === v.id));

  // A target already covered by a recorded visit — done or pending — is not scheduled again.
  const missing = targets.filter(
    (t) => !kept.some((v) => sameDay(v.visitDate, t) || sameDay(v.scheduledDate, t))
  );

  if (missing.length > 0) {
    await tx.serviceVisit.createMany({
      data: missing.map((scheduledDate) => ({
        unitId,
        // Renumbered below, so the value here only has to be unique-ish within the batch.
        sequence: 0,
        status: "PENDING" as const,
        scheduledDate,
      })),
    });
  }

  await renumberVisits(tx, unitId);
}

/**
 * Number a flat's visits 1..N in date order, so the "Service 1-4" columns read chronologically
 * however the rows were created.
 */
export async function renumberVisits(
  tx: Prisma.TransactionClient,
  unitId: string
): Promise<void> {
  const visits = await tx.serviceVisit.findMany({ where: { unitId } });

  const ordered = [...visits].sort((a, b) => {
    const da = (a.visitDate ?? a.scheduledDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const db = (b.visitDate ?? b.scheduledDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (da !== db) return da - db;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  for (const [index, visit] of ordered.entries()) {
    const sequence = index + 1;
    if (visit.sequence !== sequence) {
      await tx.serviceVisit.update({ where: { id: visit.id }, data: { sequence } });
    }
  }
}

/**
 * A flat's derived service state: what was last done, and when the next one is owed.
 * Replaces the hand-entered last-service and service-due fields the form no longer has.
 */
export function deriveServiceState(
  visits: Array<{ status: "DONE" | "PENDING"; visitDate: Date | null; scheduledDate: Date | null }>
): { lastServiceDate: Date | null; nextServiceDueDate: Date | null } {
  const done = visits
    .filter((v) => v.status === "DONE" && v.visitDate)
    .map((v) => v.visitDate as Date)
    .sort((a, b) => a.getTime() - b.getTime());

  const pending = visits
    .filter((v) => v.status === "PENDING" && v.scheduledDate)
    .map((v) => v.scheduledDate as Date)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    lastServiceDate: done.length > 0 ? done[done.length - 1] : null,
    nextServiceDueDate: pending.length > 0 ? pending[0] : null,
  };
}
