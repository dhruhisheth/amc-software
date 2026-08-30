"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { addCalendarDays, formatCalendarDate, todayUtcMidnight } from "@/lib/date";

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Not authenticated.");
  return session;
}

export interface UpdateUnitInput {
  siteName: string;
  block: string;
  contactInfo: string;
  hp: string;
  through: string;
  type: string;
  billNo: string;
  remarks: string;
  status: "DUE" | "DONE";
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function updateUnit(unitId: string, input: UpdateUnitInput): Promise<void> {
  await requireAuth();

  const existing = await prisma.unit.findUniqueOrThrow({ where: { id: unitId } });
  const hp = input.hp.trim() ? Number(input.hp) : null;

  await prisma.unit.update({
    where: { id: unitId },
    data: {
      siteName: emptyToNull(input.siteName),
      block: emptyToNull(input.block),
      contactInfo: emptyToNull(input.contactInfo),
      hp: hp !== null && Number.isFinite(hp) ? hp : null,
      through: emptyToNull(input.through),
      type: emptyToNull(input.type),
      billNo: emptyToNull(input.billNo),
      remarks: emptyToNull(input.remarks),
      status: input.status,
      statusManualOverride: input.status !== existing.status ? true : existing.statusManualOverride,
    },
  });

  revalidatePath(`/projects/${existing.projectId}`);
  revalidatePath(`/projects/${existing.projectId}/units/${unitId}`);
  revalidatePath("/");
}

export async function markServiceDone(unitId: string): Promise<void> {
  await requireAuth();

  const unit = await prisma.unit.findUniqueOrThrow({
    where: { id: unitId },
    include: { visits: true, project: true },
  });

  const appSettings = await prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const effectiveIntervalDays = unit.project.serviceIntervalDaysOverride ?? appSettings.defaultServiceIntervalDays;

  const today = todayUtcMidnight();
  const nextSequence = unit.visits.length > 0 ? Math.max(...unit.visits.map((v) => v.sequence)) + 1 : 1;

  await prisma.$transaction([
    prisma.serviceVisit.create({
      data: { unitId, sequence: nextSequence, visitDate: today, rawText: formatCalendarDate(today, "DD.MM.YYYY") },
    }),
    prisma.unit.update({
      where: { id: unitId },
      data: {
        lastServiceDate: today,
        nextServiceDueDate: addCalendarDays(today, effectiveIntervalDays),
        status: "DONE",
        statusManualOverride: true,
      },
    }),
  ]);

  revalidatePath(`/projects/${unit.projectId}`);
  revalidatePath(`/projects/${unit.projectId}/units/${unitId}`);
  revalidatePath("/");
}
