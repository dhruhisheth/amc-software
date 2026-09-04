import { prisma } from "@/lib/prisma";
import { unitLabel } from "@/lib/units";

/**
 * The project / flat / technician option lists every complaint and offer form needs. Loaded in
 * one place so the flat labels are identical wherever a flat is picked from a dropdown.
 */
export async function loadPickerOptions() {
  const [projects, units, technicians] = await Promise.all([
    prisma.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.unit.findMany({
      orderBy: [{ block: "asc" }, { flatNo: "asc" }],
      select: { id: true, projectId: true, block: true, flatNo: true, siteName: true },
    }),
    prisma.technician.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    projects,
    units: units.map((u) => ({ id: u.id, projectId: u.projectId, label: unitLabel(u) })),
    technicians,
  };
}
