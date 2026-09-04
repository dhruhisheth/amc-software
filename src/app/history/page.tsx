import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/auth/guards";
import { formatCalendarDate } from "@/lib/date";
import { summarizeServiceHistory } from "@/lib/serviceHistory";
import { unitLabel } from "@/lib/units";
import { Badge, VisitStatusBadge } from "@/components/Badges";
import type { VisitStatus } from "@/generated/prisma/enums";

type SearchParams = Record<string, string | string[] | undefined>;

function param(sp: SearchParams, key: string): string {
  const value = sp[key];
  return typeof value === "string" ? value : "";
}

/**
 * "How much service is done or pending, and on which date" — the same question answered two
 * ways: a per-flat rollup, and the underlying dated visits.
 */
export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireView();
  const sp = await searchParams;

  const projectFilter = param(sp, "projectId");
  const statusFilter = param(sp, "status");
  const technicianFilter = param(sp, "technician");

  const [projects, technicians, units] = await Promise.all([
    prisma.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.technician.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.unit.findMany({
      where: projectFilter ? { projectId: projectFilter } : {},
      orderBy: [{ block: "asc" }, { flatNo: "asc" }],
      include: {
        project: { select: { id: true, name: true } },
        visits: { orderBy: { sequence: "asc" }, include: { technician: true } },
      },
    }),
  ]);

  const now = new Date();

  const rows = units.map((unit) => ({
    unit,
    summary: summarizeServiceHistory(unit.visits, now),
  }));

  // Every visit across the filtered flats, newest date first — the "on which date" view.
  const visitRows = rows
    .flatMap(({ unit, summary }) =>
      summary.entries.map((entry) => ({ unit, entry }))
    )
    .filter(({ entry }) => {
      if (statusFilter === "DONE" || statusFilter === "PENDING") {
        return entry.status === (statusFilter as VisitStatus);
      }
      return true;
    })
    .filter(({ entry }) => {
      if (!technicianFilter) return true;
      if (technicianFilter === "unassigned") return entry.technicianName === null;
      const name = technicians.find((t) => t.id === technicianFilter)?.name;
      return entry.technicianName === name;
    })
    .sort((a, b) => (b.entry.date?.getTime() ?? 0) - (a.entry.date?.getTime() ?? 0));

  const totalDone = rows.reduce((sum, r) => sum + r.summary.doneCount, 0);
  const totalPending = rows.reduce((sum, r) => sum + r.summary.pendingCount, 0);
  const totalOverdue = rows.reduce((sum, r) => sum + r.summary.overduePendingCount, 0);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-900">Service history</h1>
      <p className="mt-1 text-sm text-slate-500">
        How much service has been done and how much is still pending, and on which date.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Flats" value={rows.length} />
        <StatCard label="Services done" value={totalDone} tone="success" />
        <StatCard label="Services pending" value={totalPending} tone="warning" />
        <StatCard label="Pending past due" value={totalOverdue} tone="danger" />
      </div>

      <form method="GET" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block font-medium text-slate-700">Project</span>
          <select
            name="projectId"
            defaultValue={projectFilter}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block font-medium text-slate-700">Visits</span>
          <select
            name="status"
            defaultValue={statusFilter}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Done and pending</option>
            <option value="DONE">Done only</option>
            <option value="PENDING">Pending only</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block font-medium text-slate-700">Technician</span>
          <select
            name="technician"
            defaultValue={technicianFilter}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Anyone</option>
            <option value="unassigned">Not recorded</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
        >
          Apply
        </button>
      </form>

      <h2 className="mt-8 text-sm font-semibold text-slate-700">Per flat</h2>
      <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-3 py-2">Flat</th>
              <th className="px-3 py-2">Project</th>
              <th className="px-3 py-2">Done</th>
              <th className="px-3 py-2">Pending</th>
              <th className="px-3 py-2">Last done on</th>
              <th className="px-3 py-2">Next pending on</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ unit, summary }) => (
              <tr key={unit.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 font-medium text-slate-900">{unitLabel(unit)}</td>
                <td className="px-3 py-2 text-slate-500">{unit.project.name}</td>
                <td className="px-3 py-2">
                  <Badge tone={summary.doneCount > 0 ? "success" : "neutral"}>{summary.doneCount}</Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge tone={summary.overduePendingCount > 0 ? "danger" : summary.pendingCount > 0 ? "warning" : "neutral"}>
                    {summary.pendingCount}
                    {summary.overduePendingCount > 0 && ` (${summary.overduePendingCount} past due)`}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {formatCalendarDate(summary.lastDoneDate) ?? "—"}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {formatCalendarDate(summary.nextPendingDate) ?? "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/projects/${unit.projectId}/units/${unit.id}`}
                    className="text-slate-500 underline hover:text-slate-900"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No flats to report on yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-slate-700">
        Every service, by date ({visitRows.length})
      </h2>
      <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Done / pending</th>
              <th className="px-3 py-2">Flat</th>
              <th className="px-3 py-2">Project</th>
              <th className="px-3 py-2">Visit no</th>
              <th className="px-3 py-2">Technician</th>
              <th className="px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {visitRows.map(({ unit, entry }) => (
              <tr key={`${unit.id}-${entry.sequence}`} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 text-slate-700">
                  {formatCalendarDate(entry.date) ?? entry.rawText ?? "—"}
                  {entry.overdue && <span className="ml-1 text-xs text-red-600">past due</span>}
                </td>
                <td className="px-3 py-2">
                  <VisitStatusBadge status={entry.status} />
                </td>
                <td className="px-3 py-2 text-slate-700">{unitLabel(unit)}</td>
                <td className="px-3 py-2 text-slate-500">{unit.project.name}</td>
                <td className="px-3 py-2 text-slate-500">{entry.sequence}</td>
                <td className="px-3 py-2 text-slate-500">{entry.technicianName ?? "—"}</td>
                <td className="px-3 py-2 text-slate-500">{entry.notes ?? "—"}</td>
              </tr>
            ))}
            {visitRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No services match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
  tone?: "default" | "danger" | "warning" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-600"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "success"
          ? "text-green-600"
          : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
