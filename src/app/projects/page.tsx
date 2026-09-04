import Link from "next/link";
import dayjs from "dayjs";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/auth/guards";
import { canEdit } from "@/lib/auth/permissions";
import { computeServiceBucket, computeRenewalBucket, resolveRenewalDueDate } from "@/lib/status";
import { AddProjectPanel } from "./ProjectForms";

export default async function ProjectsPage() {
  const session = await requireView();
  const editable = canEdit(session.user.role);

  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    include: {
      units: {
        select: {
          nextServiceDueDate: true,
          amcPeriodEnd: true,
          newAmcPeriodEnd: true,
          renewalDueDateOverride: true,
        },
      },
      uploadLogs: { orderBy: { uploadedAt: "desc" }, take: 1, include: { uploadedBy: true } },
    },
  });

  const appSettings = await prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const now = new Date();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every building/project, whether uploaded from Excel or added by hand.
          </p>
        </div>
        {editable && <AddProjectPanel />}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {projects.map((project) => {
          const overdue = project.units.filter(
            (u) => computeServiceBucket(u.nextServiceDueDate, now) === "OVERDUE"
          ).length;
          const renewals = project.units.filter((u) => {
            const bucket = computeRenewalBucket(resolveRenewalDueDate(u), now, appSettings.renewalAlertLeadDays);
            return bucket === "EXPIRED" || bucket === "EXPIRING_SOON";
          }).length;
          const lastUpload = project.uploadLogs[0];

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-sm"
            >
              <h2 className="font-semibold text-slate-900">{project.name}</h2>
              {project.address && <p className="mt-0.5 text-xs text-slate-500">{project.address}</p>}
              <p className="mt-1 text-sm text-slate-500">
                {project.units.length} flats
                {overdue > 0 && `, ${overdue} service overdue`}
                {renewals > 0 && `, ${renewals} renewal due`}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {lastUpload
                  ? `Last uploaded ${dayjs(lastUpload.uploadedAt).format("DD MMM YYYY")} by ${lastUpload.uploadedBy.name}`
                  : "Added manually — never uploaded"}
              </p>
            </Link>
          );
        })}
        {projects.length === 0 && (
          <p className="text-sm text-slate-400">
            No projects yet. Add one above, or upload an Excel sheet to get started.
          </p>
        )}
      </div>
    </div>
  );
}
