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
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview across all {units.length} tracked flats in {byProject.size} projects.
          </p>
        </div>
        <a
          href="/api/export"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Export to Excel
        </a>
      </div>

      {/* Service and renewal are counted separately on purpose — they are two different due dates. */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total flats" value={units.length} href="/projects" />
        <StatCard label="Service overdue" value={overdue} tone="danger" href="/history" />
        <StatCard label="Service due soon" value={dueSoon} tone="warning" href="/history" />
        <StatCard
          label="Renewals due"
          value={renewalExpired + renewalExpiringSoon}
          tone="warning"
          href="/projects"
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

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700">Projects</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-2">Project</th>
                <th className="px-4 py-2">Flats</th>
                <th className="px-4 py-2">Service overdue</th>
                <th className="px-4 py-2">Service due soon</th>
                <th className="px-4 py-2">Renewals due</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {projectRows.map(([projectId, row]) => (
                <tr key={projectId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-slate-900">{row.name}</td>
                  <td className="px-4 py-2">{row.total}</td>
                  <td className="px-4 py-2">
                    {row.overdue > 0 ? <Badge tone="danger">{row.overdue}</Badge> : row.overdue}
                  </td>
                  <td className="px-4 py-2">
                    {row.dueSoon > 0 ? <Badge tone="warning">{row.dueSoon}</Badge> : row.dueSoon}
                  </td>
                  <td className="px-4 py-2">
                    {row.renewals > 0 ? <Badge tone="warning">{row.renewals}</Badge> : row.renewals}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/projects/${projectId}`}
                      className="text-slate-500 underline hover:text-slate-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {projectRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No projects yet. Add one from Projects, or upload an Excel sheet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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
  const toneClass =
    tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : "text-slate-900";
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
      {note && <p className="text-xs text-slate-400">{note}</p>}
    </Link>
  );
}
