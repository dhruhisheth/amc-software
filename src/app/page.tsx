import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  computeServiceBucket,
  computeRenewalBucket,
  effectiveAmcEnd,
} from "@/lib/status";

export default async function Home() {
  const [units, appSettings] = await Promise.all([
    prisma.unit.findMany({
      select: {
        id: true,
        nextServiceDueDate: true,
        amcPeriodEnd: true,
        newAmcPeriodEnd: true,
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
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
    const renewalBucket = computeRenewalBucket(
      effectiveAmcEnd(unit),
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

  const projectRows = [...byProject.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview across all {units.length} tracked units in {byProject.size} projects.
          </p>
        </div>
        <a
          href="/api/export"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Export to Excel
        </a>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total units" value={units.length} />
        <StatCard label="Overdue for service" value={overdue} tone="danger" />
        <StatCard label="Service due soon" value={dueSoon} tone="warning" />
        <StatCard label="AMC renewals due" value={renewalExpired + renewalExpiringSoon} tone="warning" />
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700">Projects</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-2">Project</th>
                <th className="px-4 py-2">Units</th>
                <th className="px-4 py-2">Overdue</th>
                <th className="px-4 py-2">Due soon</th>
                <th className="px-4 py-2">Renewals</th>
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
                    <Link href={`/projects/${projectId}`} className="text-slate-500 underline hover:text-slate-900">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {projectRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No projects yet. Upload an Excel sheet to get started.
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
}: {
  label: string;
  value: number;
  tone?: "default" | "danger" | "warning";
}) {
  const toneClass =
    tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "danger" | "warning" }) {
  const toneClass = tone === "danger" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}>{children}</span>;
}
