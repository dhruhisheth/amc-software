"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import type { Role } from "@/lib/auth/permissions";
import { isRootAdminEmail, normalizeEmail } from "@/lib/auth/root-admin";
import { addCalendarDays } from "@/lib/date";
import { Prisma } from "@/generated/prisma/client";

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

export interface CompanySettingsInput {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  offerTaxPercent: string;
  offerTermsText: string;
}

/** The letterhead and defaults that every generated AMC offer is built from. */
export async function updateCompanySettings(input: CompanySettingsInput): Promise<void> {
  await requireAdmin();

  const taxPercent = Number(input.offerTaxPercent);

  await prisma.appSettings.update({
    where: { id: 1 },
    data: {
      companyName: input.companyName.trim(),
      companyAddress: input.companyAddress.trim(),
      companyPhone: input.companyPhone.trim(),
      companyEmail: input.companyEmail.trim(),
      offerTaxPercent: Number.isFinite(taxPercent) ? taxPercent : 0,
      offerTermsText: input.offerTermsText.trim(),
    },
  });

  revalidatePath("/settings");
  revalidatePath("/offers");
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

export async function createUser(email: string, name: string, password: string, role: Role): Promise<void> {
  await requireAdmin();
  const normalizedEmail = normalizeEmail(email);

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

export async function updateUserRole(userId: string, role: Role): Promise<void> {
  const session = await requireAdmin();
  if (session.user.id === userId && role !== "ADMIN") {
    throw new Error("You cannot remove your own admin access.");
  }

  const target = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  // The owner account is admin by definition — see lib/auth/root-admin.ts. Refuse rather than
  // silently no-op, so the UI reports why nothing changed.
  if (isRootAdminEmail(target.email) && role !== "ADMIN") {
    throw new Error("The owner account is always an admin and cannot be changed.");
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/settings");
}

export async function deleteUser(userId: string): Promise<void> {
  const session = await requireAdmin();
  if (session.user.id === userId) throw new Error("You cannot remove your own account.");

  const target = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (isRootAdminEmail(target.email)) {
    throw new Error("The owner account cannot be removed.");
  }

  // Uploads and offers reference their author with a required, non-cascading foreign key, so a
  // user who has either can't be deleted without destroying that history. Keep the history and
  // lock the account out instead by dropping it to view-only.
  const [uploadCount, offerCount] = await Promise.all([
    prisma.uploadLog.count({ where: { uploadedById: userId } }),
    prisma.amcOffer.count({ where: { createdById: userId } }),
  ]);

  if (uploadCount > 0 || offerCount > 0) {
    throw new Error(
      `${target.name} has uploads or AMC offers recorded against them, so the account cannot be ` +
        "deleted without losing that history. Set the role to View only instead."
    );
  }

  await prisma.$transaction([
    prisma.pendingUpload.deleteMany({ where: { uploadedById: userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
  revalidatePath("/settings");
}
