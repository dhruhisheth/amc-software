"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { addCalendarDays } from "@/lib/date";
import { Prisma } from "@/generated/prisma/client";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") throw new Error("Admin access required.");
  return session;
}

export async function updateAppSettings(defaultServiceIntervalDays: number, renewalAlertLeadDays: number): Promise<void> {
  await requireAdmin();
  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: { defaultServiceIntervalDays, renewalAlertLeadDays },
    create: { id: 1, defaultServiceIntervalDays, renewalAlertLeadDays },
  });

  // The global interval changed — recompute every unit's next-due date that doesn't have its
  // own per-project override, so the dashboard reflects the new setting immediately rather than
  // only on the next upload.
  const affectedUnits = await prisma.unit.findMany({
    where: { project: { serviceIntervalDaysOverride: null }, lastServiceDate: { not: null } },
    select: { id: true, lastServiceDate: true },
  });
  await prisma.$transaction(
    affectedUnits.map((u) =>
      prisma.unit.update({
        where: { id: u.id },
        data: { nextServiceDueDate: addCalendarDays(u.lastServiceDate!, defaultServiceIntervalDays) },
      })
    )
  );

  revalidatePath("/settings");
  revalidatePath("/");
}

export async function updateProjectInterval(projectId: string, days: number | null): Promise<void> {
  await requireAdmin();
  const appSettings = await prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  await prisma.project.update({ where: { id: projectId }, data: { serviceIntervalDaysOverride: days } });

  const effectiveDays = days ?? appSettings.defaultServiceIntervalDays;
  const units = await prisma.unit.findMany({
    where: { projectId, lastServiceDate: { not: null } },
    select: { id: true, lastServiceDate: true },
  });
  await prisma.$transaction(
    units.map((u) =>
      prisma.unit.update({
        where: { id: u.id },
        data: { nextServiceDueDate: addCalendarDays(u.lastServiceDate!, effectiveDays) },
      })
    )
  );

  revalidatePath("/settings");
  revalidatePath("/");
}

export async function createUser(email: string, name: string, password: string, role: "ADMIN" | "STAFF"): Promise<void> {
  await requireAdmin();
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new Error(`A user with email ${normalizedEmail} already exists.`);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    await prisma.user.create({
      data: { email: normalizedEmail, name: name.trim(), passwordHash, role },
    });
  } catch (err) {
    // Defense-in-depth against the check-then-create race above: the unique constraint is the
    // real guarantee, this just keeps the error message friendly if it's ever hit concurrently.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error(`A user with email ${normalizedEmail} already exists.`);
    }
    throw err;
  }
  revalidatePath("/settings");
}

export async function updateUserRole(userId: string, role: "ADMIN" | "STAFF"): Promise<void> {
  const session = await requireAdmin();
  if (session.user.id === userId && role !== "ADMIN") {
    throw new Error("You cannot remove your own admin access.");
  }
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/settings");
}
