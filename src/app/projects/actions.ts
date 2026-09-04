"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireDelete, requireEdit } from "@/lib/auth/guards";
import { emptyToNull, normalizeName, parseNumber, requiredText } from "@/lib/forms";
import { effectiveIntervalDays } from "@/lib/serviceInterval";
import { unitDataFromInput, type UnitInput } from "@/lib/units";
import { Prisma } from "@/generated/prisma/client";

/* ------------------------------------------------------------------ projects (project-wise) */

export interface ProjectInput {
  name: string;
  address: string;
  serviceIntervalDaysOverride: string;
}

async function assertProjectNameFree(normalizedName: string, exceptProjectId?: string): Promise<void> {
  const clash = await prisma.project.findUnique({ where: { normalizedName } });
  if (clash && clash.id !== exceptProjectId) {
    throw new Error(`A project named "${clash.name}" already exists.`);
  }
}

export async function createProject(input: ProjectInput): Promise<string> {
  await requireEdit();

  const name = requiredText(input.name, "Project name");
  const normalizedName = normalizeName(name);
  await assertProjectNameFree(normalizedName);

  try {
    const project = await prisma.project.create({
      data: {
        name,
        normalizedName,
        address: emptyToNull(input.address),
        serviceIntervalDaysOverride: parseNumber(input.serviceIntervalDaysOverride),
      },
    });
    revalidatePath("/projects");
    revalidatePath("/");
    return project.id;
  } catch (err) {
    // The unique index is the real guarantee behind the check above, which can race.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error(`A project named "${name}" already exists.`);
    }
    throw err;
  }
}

export async function updateProject(projectId: string, input: ProjectInput): Promise<void> {
  await requireEdit();

  const name = requiredText(input.name, "Project name");
  const normalizedName = normalizeName(name);
  await assertProjectNameFree(normalizedName, projectId);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      name,
      normalizedName,
      address: emptyToNull(input.address),
      serviceIntervalDaysOverride: parseNumber(input.serviceIntervalDaysOverride),
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

/**
 * Admin-only — staff may edit but never delete. Flats and their visits cascade with the project;
 * complaints and offers only have their project reference nulled, so that history survives.
 */
export async function deleteProject(projectId: string): Promise<void> {
  await requireDelete();

  await prisma.$transaction([
    // UploadLog.projectId is required with no cascade, so those rows have to go first.
    prisma.uploadLog.deleteMany({ where: { projectId } }),
    prisma.project.delete({ where: { id: projectId } }),
  ]);

  revalidatePath("/projects");
  revalidatePath("/");
  redirect("/projects");
}

/* ----------------------------------------------------------------------- flats (flat-wise) */

// The flat form's shape and its column mapping live in @/lib/units, shared with the flat's own
// edit page. Editing and deleting a flat live there too; only creation belongs to the project.
export async function createUnit(projectId: string, input: UnitInput): Promise<string> {
  await requireEdit();

  const intervalDays = await effectiveIntervalDays(projectId);

  // sourceRowNumber orders flats within a project and comes from the Excel row for imported
  // ones. A hand-added flat has no row, so it goes after everything currently there.
  const last = await prisma.unit.findFirst({
    where: { projectId },
    orderBy: { sourceRowNumber: "desc" },
    select: { sourceRowNumber: true },
  });

  const unit = await prisma.unit.create({
    data: {
      projectId,
      sourceRowNumber: (last?.sourceRowNumber ?? 0) + 1,
      ...unitDataFromInput(input, intervalDays),
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  return unit.id;
}
