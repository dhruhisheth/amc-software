"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireDelete, requireEdit } from "@/lib/auth/guards";
import { formatCalendarDate, parseDateInput, todayUtcMidnight } from "@/lib/date";
import { emptyToNull } from "@/lib/forms";
import { unitDataFromInput, type UnitInput } from "@/lib/units";
import { resyncUnit } from "@/lib/unitSync";

function revalidateUnit(projectId: string, unitId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/units/${unitId}`);
  revalidatePath("/history");
  revalidatePath("/");
}

export async function updateUnit(unitId: string, input: UnitInput): Promise<void> {
  await requireEdit();

  const existing = await prisma.unit.findUniqueOrThrow({
    where: { id: unitId },
    select: { projectId: true },
  });

  await prisma.unit.update({
    where: { id: unitId },
    data: unitDataFromInput(input),
  });

  // The AMC dates may have moved, which moves the whole quarterly schedule with them.
  await resyncUnit(unitId);

  revalidateUnit(existing.projectId, unitId);
}

/** Admin-only. The flat's service visits cascade; its complaints and offers are kept. */
export async function deleteUnit(unitId: string): Promise<void> {
  await requireDelete();

  const unit = await prisma.unit.findUniqueOrThrow({
    where: { id: unitId },
    select: { projectId: true },
  });
  await prisma.unit.delete({ where: { id: unitId } });

  revalidatePath(`/projects/${unit.projectId}`);
  revalidatePath("/history");
  revalidatePath("/");
  redirect(`/projects/${unit.projectId}`);
}

export interface ScheduleVisitInput {
  scheduledDate: string;
  technicianId: string;
  notes: string;
}

/**
 * Records an extra service visit that is planned but not yet carried out. The four quarterly
 * visits are scheduled automatically from the AMC dates — this is for anything beyond them.
 */
export async function scheduleVisit(unitId: string, input: ScheduleVisitInput): Promise<void> {
  await requireEdit();

  const scheduledDate = parseDateInput(input.scheduledDate);
  if (!scheduledDate) throw new Error("A scheduled date is required.");

  const unit = await prisma.unit.findUniqueOrThrow({ where: { id: unitId } });

  await prisma.serviceVisit.create({
    data: {
      unitId,
      // resyncUnit renumbers every visit into date order straight afterwards.
      sequence: 0,
      status: "PENDING",
      scheduledDate,
      technicianId: input.technicianId || null,
      notes: emptyToNull(input.notes),
    },
  });

  await resyncUnit(unitId);
  revalidateUnit(unit.projectId, unitId);
}

export interface CompleteVisitInput {
  visitDate: string;
  technicianId: string;
  notes: string;
}

/**
 * Marks a service as carried out. The flat's last-service date, next-due date and DUE/DONE
 * status are all recomputed from its visits afterwards, never written by hand here. The renewal
 * date is untouched by design — servicing a flat never renews its contract.
 */
export async function completeVisit(
  unitId: string,
  input: CompleteVisitInput,
  existingVisitId?: string
): Promise<void> {
  await requireEdit();

  const visitDate = parseDateInput(input.visitDate) ?? todayUtcMidnight();
  const unit = await prisma.unit.findUniqueOrThrow({ where: { id: unitId } });

  const visitData = {
    status: "DONE" as const,
    visitDate,
    technicianId: input.technicianId || null,
    notes: emptyToNull(input.notes),
    rawText: formatCalendarDate(visitDate, "DD.MM.YYYY"),
  };

  if (existingVisitId) {
    await prisma.serviceVisit.update({ where: { id: existingVisitId }, data: visitData });
  } else {
    await prisma.serviceVisit.create({ data: { unitId, sequence: 0, ...visitData } });
  }

  await resyncUnit(unitId);
  revalidateUnit(unit.projectId, unitId);
}

export async function deleteVisit(unitId: string, visitId: string): Promise<void> {
  await requireDelete();
  const unit = await prisma.unit.findUniqueOrThrow({ where: { id: unitId } });
  await prisma.serviceVisit.delete({ where: { id: visitId } });
  await resyncUnit(unitId);
  revalidateUnit(unit.projectId, unitId);
}
