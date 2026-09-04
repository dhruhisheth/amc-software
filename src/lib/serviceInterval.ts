import { prisma } from "@/lib/prisma";

/**
 * The service interval that applies to a project: its own override, else the app-wide default.
 * Shared so every place that computes a next-service-due date agrees on the same number.
 */
export async function effectiveIntervalDays(projectId: string): Promise<number> {
  const [project, appSettings] = await Promise.all([
    prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { serviceIntervalDaysOverride: true },
    }),
    prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
  ]);
  return project.serviceIntervalDaysOverride ?? appSettings.defaultServiceIntervalDays;
}
