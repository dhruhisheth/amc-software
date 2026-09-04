"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireDelete, requireEdit } from "@/lib/auth/guards";
import { addCalendarDays, formatCalendarDate, parseDateInput, todayUtcMidnight } from "@/lib/date";
import { emptyToNull } from "@/lib/forms";
import { effectiveIntervalDays } from "@/lib/serviceInterval";
import { unitDataFromInput, type UnitInput } from "@/lib/units";

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
    select: { projectId: true, status: true, statusManualOverride: true },
  });
  const intervalDays = await effectiveIntervalDays(existing.projectId);

  await prisma.unit.update({
    where: { id: unitId },
    data: {
      ...unitDataFromInput(input, intervalDays),
      statusManualOverride: input.status !== existing.status ? true : existing.statusManualOverride,
    },
  });

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

async function nextVisitSequence(unitId: string): Promise<number> {
  const max = await prisma.serviceVisit.aggregate({ where: { unitId }, _max: { sequence: true } });
  return (max._max.sequence ?? 0) + 1;
}

export interface ScheduleVisitInput {
  scheduledDate: string;
  technicianId: string;
  notes: string;
}

/** Records a service visit that is planned but not yet carried out — the "pending" side of the history. */
export async function scheduleVisit(unitId: string, input: ScheduleVisitInput): Promise<void> {
  await requireEdit();

  const scheduledDate = parseDateInput(input.scheduledDate);
  if (!scheduledDate) throw new Error("A scheduled date is required.");

  const unit = await prisma.unit.findUniqueOrThrow({ where: { id: unitId } });

  await prisma.serviceVisit.create({
    data: {
      unitId,
      sequence: await nextVisitSequence(unitId),
      status: "PENDING",
      scheduledDate,
      technicianId: input.technicianId || null,
      notes: emptyToNull(input.notes),
    },
  });

  revalidateUnit(unit.projectId, unitId);
}

export interface CompleteVisitInput {
  visitDate: string;
  technicianId: string;
  notes: string;
}

/**
 * Marks a service as carried out. Rolls the flat's last-service and service-due dates forward,
 * and deliberately leaves the renewal date alone — servicing a flat never renews its contract.
 */
export async function completeVisit(
  unitId: string,
  input: CompleteVisitInput,
  existingVisitId?: string
): Promise<void> {
  await requireEdit();

  const visitDate = parseDateInput(input.visitDate) ?? todayUtcMidnight();

  const unit = await prisma.unit.findUniqueOrThrow({ where: { id: unitId }, include: { project: true } });
  const appSettings = await prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const intervalDays = unit.project.serviceIntervalDaysOverride ?? appSettings.defaultServiceIntervalDays;

  const visitData = {
    status: "DONE" as const,
    visitDate,
    technicianId: input.technicianId || null,
    notes: emptyToNull(input.notes),
    rawText: formatCalendarDate(visitDate, "DD.MM.YYYY"),
  };

  // The last-service date should only ever move forward: completing a back-dated visit must not
  // pull a more recent one backwards.
  const isLatest = !unit.lastServiceDate || visitDate.getTime() >= unit.lastServiceDate.getTime();

  await prisma.$transaction([
    existingVisitId
      ? prisma.serviceVisit.update({ where: { id: existingVisitId }, data: visitData })
      : prisma.serviceVisit.create({
          data: { unitId, sequence: await nextVisitSequence(unitId), ...visitData },
        }),
    prisma.unit.update({
      where: { id: unitId },
      data: isLatest
        ? {
            lastServiceDate: visitDate,
            nextServiceDueDate: addCalendarDays(visitDate, intervalDays),
            status: "DONE",
            statusManualOverride: true,
          }
        : {},
    }),
  ]);

  revalidateUnit(unit.projectId, unitId);
}

export async function deleteVisit(unitId: string, visitId: string): Promise<void> {
  await requireDelete();
  const unit = await prisma.unit.findUniqueOrThrow({ where: { id: unitId } });
  await prisma.serviceVisit.delete({ where: { id: visitId } });
  revalidateUnit(unit.projectId, unitId);
}
