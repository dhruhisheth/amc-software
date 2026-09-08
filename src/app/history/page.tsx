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

  const [projects, technicians, units, reminders] = await Promise.all([
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
    prisma.reminder.findMany({
      where: projectFilter ? { unit: { projectId: projectFilter } } : {},
      orderBy: { dueDate: "asc" },
      take: 50,
      include: { unit: { include: { project: { select: { name: true } } } } },
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
    <div className="app-content">
      <h1>Service history</h1>
      <p className="muted">
        How much service has been done and how much is still pending, and on which date.
      </p>

      <div className="stat-tiles four">
        <StatCard label="Flats" value={rows.length} />
        <StatCard label="Services done" value={totalDone} tone="success" />
        <StatCard label="Services pending" value={totalPending} tone="warning" />
        <StatCard label="Pending past due" value={totalOverdue} tone="danger" />
      </div>

      <form method="GET" className="filters">
        <label className="field">
          <span className="field-label">Project</span>
          <select
            name="projectId"
            defaultValue={projectFilter}
           
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Visits</span>
          <select
            name="status"
            defaultValue={statusFilter}
           
          >
            <option value="">Done and pending</option>
            <option value="DONE">Done only</option>
            <option value="PENDING">Pending only</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Technician</span>
          <select
            name="technician"
            defaultValue={technicianFilter}
           
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
         
        >
          Apply
        </button>
      </form>

      <span className="section-label">Reminders ({reminders.length})</span>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Due</th>
              <th>What</th>
              <th>Flat</th>
              <th>Project</th>
              <th>Status</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {reminders.map((reminder) => (
              <tr key={reminder.id}>
                <td>{formatCalendarDate(reminder.dueDate)}</td>
                <td>{reminder.kind === "SERVICE_DUE" ? "Service" : "Renewal"}</td>
                <td>{unitLabel(reminder.unit)}</td>
                <td className="muted">{reminder.unit.project.name}</td>
                <td>
                  <Badge
                    tone={
                      reminder.status === "SENT"
                        ? "success"
                        : reminder.status === "FAILED"
                          ? "danger"
                          : reminder.status === "SKIPPED"
                            ? "warning"
                            : "neutral"
                    }
                  >
                    {reminder.status}
                  </Badge>
                </td>
                <td className="cell-sub">
                  {reminder.sentAt
                    ? `Sent ${formatCalendarDate(reminder.sentAt)} via ${reminder.channel ?? "—"}`
                    : (reminder.error ?? "Waiting to send")}
                </td>
              </tr>
            ))}
            {reminders.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  Nothing due inside the reminder window yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <span className="section-label">Per flat</span>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Flat</th>
              <th>Project</th>
              <th>Done</th>
              <th>Pending</th>
              <th>Last done on</th>
              <th>Next pending on</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ unit, summary }) => (
              <tr key={unit.id}>
                <td className="cell-strong">{unitLabel(unit)}</td>
                <td className="muted">{unit.project.name}</td>
                <td>
                  <Badge tone={summary.doneCount > 0 ? "success" : "neutral"}>{summary.doneCount}</Badge>
                </td>
                <td>
                  <Badge tone={summary.overduePendingCount > 0 ? "danger" : summary.pendingCount > 0 ? "warning" : "neutral"}>
                    {summary.pendingCount}
                    {summary.overduePendingCount > 0 && ` (${summary.overduePendingCount} past due)`}
                  </Badge>
                </td>
                <td>
                  {formatCalendarDate(summary.lastDoneDate) ?? "—"}
                </td>
                <td>
                  {formatCalendarDate(summary.nextPendingDate) ?? "—"}
                </td>
                <td className="numeric">
                  <Link
                    href={`/projects/${unit.projectId}/units/${unit.id}`}
                   
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-state">
                  No flats to report on yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="section-label">
        Every service, by date ({visitRows.length})
      </h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Done / pending</th>
              <th>Flat</th>
              <th>Project</th>
              <th>Visit no</th>
              <th>Technician</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {visitRows.map(({ unit, entry }) => (
              <tr key={`${unit.id}-${entry.sequence}`}>
                <td>
                  {formatCalendarDate(entry.date) ?? entry.rawText ?? "—"}
                  {entry.overdue && <span className="error-text">past due</span>}
                </td>
                <td>
                  <VisitStatusBadge status={entry.status} />
                </td>
                <td>{unitLabel(unit)}</td>
                <td className="muted">{unit.project.name}</td>
                <td className="muted">{entry.sequence}</td>
                <td className="muted">{entry.technicianName ?? "—"}</td>
                <td className="muted">{entry.notes ?? "—"}</td>
              </tr>
            ))}
            {visitRows.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-state">
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
  return (
    <div className="stat-tile">
      <span className="stat-tile-label">{label}</span>
      <span className={tone === "default" ? "stat-tile-value" : `stat-tile-value ${tone}`}>
        {value}
      </span>
    </div>
  );
}
