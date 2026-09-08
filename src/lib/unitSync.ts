import { prisma } from "@/lib/prisma";
import { deriveServiceState, syncQuarterlyVisits } from "@/lib/schedule";

/**
 * Recompute everything about a flat that is derived rather than entered: its four quarterly
 * service visits, its last-service and service-due dates, and its DUE/DONE status.
 *
 * Called after any change that can move those — editing a flat's AMC dates, completing or
 * scheduling a visit, deleting a visit. Keeping it in one place is what lets the flat form drop
 * those four fields without them drifting out of date.
 */
export async function resyncUnit(unitId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const unit = await tx.unit.findUniqueOrThrow({
      where: { id: unitId },
      select: { amcPeriodStart: true },
    });

    await syncQuarterlyVisits(tx, unitId, unit.amcPeriodStart);

    const visits = await tx.serviceVisit.findMany({
      where: { unitId },
      select: { status: true, visitDate: true, scheduledDate: true },
    });

    const { lastServiceDate, nextServiceDueDate } = deriveServiceState(visits);

    await tx.unit.update({
      where: { id: unitId },
      data: {
        lastServiceDate,
        nextServiceDueDate,
        // A flat is DONE once every scheduled visit has been carried out, DUE otherwise.
        status: visits.length > 0 && visits.every((v) => v.status === "DONE") ? "DONE" : "DUE",
        statusManualOverride: false,
      },
    });
  });
}
