import Link from "next/link";
import dayjs from "dayjs";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/auth/guards";
import { canEdit } from "@/lib/auth/permissions";
import { computeServiceBucket, computeRenewalBucket, resolveRenewalDueDate } from "@/lib/status";
import { Badge } from "@/components/Badges";
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
    <main className="app-content">
      <div className="page">
        <div className="page-header">
          <div>
            <h2>Projects</h2>
            <p>Every building/project, whether uploaded from Excel or added by hand.</p>
          </div>
          {editable && (
            <div className="page-actions">
              <AddProjectPanel />
            </div>
          )}
        </div>

        <div className="system-list">
          {projects.map((project) => {
            const overdue = project.units.filter(
              (u) => computeServiceBucket(u.nextServiceDueDate, now) === "OVERDUE"
            ).length;
            const renewals = project.units.filter((u) => {
              const bucket = computeRenewalBucket(
                resolveRenewalDueDate(u),
                now,
                appSettings.renewalAlertLeadDays
              );
              return bucket === "EXPIRED" || bucket === "EXPIRING_SOON";
            }).length;
            const lastUpload = project.uploadLogs[0];

            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="card project-card">
                <div>
                  <div className="cell-strong">{project.name}</div>
                  {project.address && <div className="cell-sub">{project.address}</div>}
                </div>
                <div className="project-card-meta">
                  <span>{project.units.length} flats</span>
                  {overdue > 0 && <Badge tone="danger">{overdue} service overdue</Badge>}
                  {renewals > 0 && <Badge tone="warning">{renewals} renewal due</Badge>}
                </div>
                <span className="cell-sub">
                  {lastUpload
                    ? `Last uploaded ${dayjs(lastUpload.uploadedAt).format("DD MMM YYYY")} by ${lastUpload.uploadedBy.name}`
                    : "Added manually — never uploaded"}
                </span>
              </Link>
            );
          })}
          {projects.length === 0 && (
            <p className="empty-state">
              No projects yet. Add one above, or upload an Excel sheet to get started.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
