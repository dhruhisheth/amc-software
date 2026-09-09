import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/auth/guards";
import { computeServiceBucket, computeRenewalBucket, resolveRenewalDueDate } from "@/lib/status";
import { isOpenComplaint } from "@/lib/complaints";
import { Badge } from "@/components/Badges";

export default async function Home() {
  await requireView();

  const [units, appSettings, complaints, pendingVisits] = await Promise.all([
    prisma.unit.findMany({
      select: {
        id: true,
        nextServiceDueDate: true,
        amcPeriodEnd: true,
        newAmcPeriodEnd: true,
        renewalDueDateOverride: true,
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
    prisma.complaint.findMany({ select: { status: true, technicianId: true } }),
    prisma.serviceVisit.count({ where: { status: "PENDING" } }),
  ]);

  const now = new Date();
  let overdue = 0;
  let dueSoon = 0;
  let renewalExpired = 0;
  let renewalExpiringSoon = 0;

  const byProject = new Map<
    string,
    { name: string; total: number; overdue: number; dueSoon: number; renewals: number }
  >();

  for (const unit of units) {
    const bucket = computeServiceBucket(unit.nextServiceDueDate, now);
    // Renewal is read from the renewal due date, which is its own thing — not the service date.
    const renewalBucket = computeRenewalBucket(
      resolveRenewalDueDate(unit),
      now,
      appSettings.renewalAlertLeadDays
    );

    if (bucket === "OVERDUE") overdue++;
    if (bucket === "DUE_SOON") dueSoon++;
    if (renewalBucket === "EXPIRED") renewalExpired++;
    if (renewalBucket === "EXPIRING_SOON") renewalExpiringSoon++;

    const entry = byProject.get(unit.project.id) ?? {
      name: unit.project.name,
      total: 0,
      overdue: 0,
      dueSoon: 0,
      renewals: 0,
    };
    entry.total++;
    if (bucket === "OVERDUE") entry.overdue++;
    if (bucket === "DUE_SOON") entry.dueSoon++;
    if (renewalBucket === "EXPIRED" || renewalBucket === "EXPIRING_SOON") entry.renewals++;
    byProject.set(unit.project.id, entry);
  }

  const openComplaints = complaints.filter((c) => isOpenComplaint(c.status));
  const unassignedComplaints = openComplaints.filter((c) => !c.technicianId);

  const projectRows = [...byProject.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));

  return (
    <main className="app-content">
      <div className="page">
        <div className="page-header">
          <div>
            <h2>Dashboard</h2>
            <p>
              Overview across all {units.length} tracked flats in {byProject.size} projects.
            </p>
          </div>
          <div className="page-actions">
            <a className="button" href="/api/export">
              Export to Excel
            </a>
          </div>
        </div>

        {/* Service and renewal are counted separately on purpose — two different due dates. */}
        <div className="stat-tiles six">
        <StatCard label="Total flats" value={units.length} href="/projects" />
        <StatCard
          label="Service overdue"
          value={overdue}
          tone="danger"
          href="/history"
          note="all time"
        />
        <StatCard label="Service due soon" value={dueSoon} tone="warning" href="/history" />
        <StatCard
          label="Renewals due"
          value={renewalExpired + renewalExpiringSoon}
          tone="warning"
          href="/projects"
          note="all time"
        />
        <StatCard label="Services pending" value={pendingVisits} tone="warning" href="/history" />
        <StatCard
          label="Open complaints"
          value={openComplaints.length}
          tone={unassignedComplaints.length > 0 ? "danger" : "warning"}
          href="/complaints"
          note={
            unassignedComplaints.length > 0
              ? `${unassignedComplaints.length} unassigned`
              : undefined
          }
        />
      </div>

        <span className="section-label">Projects</span>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Flats</th>
                <th>Service overdue</th>
                <th>Service due soon</th>
                <th>Renewals due</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projectRows.map(([projectId, row]) => (
                <tr key={projectId}>
                  <td className="cell-strong">{row.name}</td>
                  <td>{row.total}</td>
                  <td>{row.overdue > 0 ? <Badge tone="danger">{row.overdue}</Badge> : row.overdue}</td>
                  <td>{row.dueSoon > 0 ? <Badge tone="warning">{row.dueSoon}</Badge> : row.dueSoon}</td>
                  <td>
                    {row.renewals > 0 ? <Badge tone="warning">{row.renewals}</Badge> : row.renewals}
                  </td>
                  <td className="numeric">
                    <Link href={`/projects/${projectId}`}>View</Link>
                  </td>
                </tr>
              ))}
              {projectRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    No projects yet. Add one from Projects, or upload an Excel sheet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
  href,
  note,
}: {
  label: string;
  value: number;
  tone?: "default" | "danger" | "warning";
  href: string;
  note?: string;
}) {
  return (
    <Link href={href} className="stat-tile">
      <span className="stat-tile-label">{label}</span>
      <span className={tone === "default" ? "stat-tile-value" : `stat-tile-value ${tone}`}>
        {value}
      </span>
      {note && <span className="stat-tile-caption">{note}</span>}
    </Link>
  );
}
