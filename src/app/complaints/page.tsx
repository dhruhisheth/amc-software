import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/auth/guards";
import { canEdit } from "@/lib/auth/permissions";
import { formatCalendarDate } from "@/lib/date";
import { COMPLAINT_STATUSES, isOpenComplaint } from "@/lib/complaints";
import { unitLabel } from "@/lib/units";
import { ComplaintStatusBadge, PriorityBadge, COMPLAINT_STATUS_LABELS } from "@/components/Badges";
import { AssignTechnicianSelect } from "./ComplaintForms";
import type { ComplaintStatus } from "@/generated/prisma/enums";

type SearchParams = Record<string, string | string[] | undefined>;

function param(sp: SearchParams, key: string): string {
  const value = sp[key];
  return typeof value === "string" ? value : "";
}

export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireView();
  const editable = canEdit(session.user.role);
  const sp = await searchParams;

  const statusFilter = param(sp, "status");
  const technicianFilter = param(sp, "technician");
  const search = param(sp, "q").trim();

  const [complaints, technicians] = await Promise.all([
    prisma.complaint.findMany({
      where: {
        ...(COMPLAINT_STATUSES.includes(statusFilter as ComplaintStatus)
          ? { status: statusFilter as ComplaintStatus }
          : {}),
        ...(technicianFilter === "unassigned"
          ? { technicianId: null }
          : technicianFilter
            ? { technicianId: technicianFilter }
            : {}),
      },
      orderBy: [{ status: "asc" }, { reportedAt: "desc" }],
      include: { project: true, unit: true, technician: true },
    }),
    prisma.technician.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const rows = search
    ? complaints.filter((c) =>
        [c.ticketNo, c.subject, c.complainantName, c.project?.name, c.technician?.name]
          .some((field) => (field ?? "").toLowerCase().includes(search.toLowerCase()))
      )
    : complaints;

  const openCount = rows.filter((c) => isOpenComplaint(c.status)).length;
  const unassignedCount = rows.filter((c) => !c.technicianId && isOpenComplaint(c.status)).length;

  return (
    <div className="app-content">
      <div className="page-header">
        <div>
          <h1>Complaints</h1>
          <p className="muted">
            {rows.length} complaints · {openCount} still open · {unassignedCount} unassigned
          </p>
        </div>
        <div className="page-actions">
          <Link
            href="/complaints/technicians"
           
          >
            Technicians
          </Link>
          {editable && (
            <Link
              href="/complaints/new"
              className="primary"
            >
              Log complaint
            </Link>
          )}
        </div>
      </div>

      <form method="GET" className="filters">
        <label className="field">
          <span className="field-label">Search</span>
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Ticket, subject, name..."
           
          />
        </label>
        <label className="field">
          <span className="field-label">Status</span>
          <select
            name="status"
            defaultValue={statusFilter}
           
          >
            <option value="">All</option>
            {COMPLAINT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {COMPLAINT_STATUS_LABELS[st]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Technician</span>
          <select
            name="technician"
            defaultValue={technicianFilter}
           
          >
            <option value="">Anyone</option>
            <option value="unassigned">Unassigned</option>
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

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Subject</th>
              <th>Project / Flat</th>
              <th>Reported</th>
              <th>Priority</th>
              <th>Technician attending</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="cell-strong">{c.ticketNo}</td>
                <td>
                  {c.subject}
                  {c.complainantName && (
                    <div className="cell-sub">{c.complainantName}</div>
                  )}
                </td>
                <td className="muted">
                  {c.project?.name ?? "—"}
                  {c.unit && <div className="cell-sub">{unitLabel(c.unit)}</div>}
                </td>
                <td className="muted">{formatCalendarDate(c.reportedAt) ?? "—"}</td>
                <td>
                  <PriorityBadge priority={c.priority} />
                </td>
                <td>
                  <AssignTechnicianSelect
                    complaintId={c.id}
                    technicianId={c.technicianId}
                    technicians={technicians.map((t) => ({ id: t.id, name: t.name }))}
                    disabled={!editable}
                  />
                </td>
                <td>
                  <ComplaintStatusBadge status={c.status} />
                </td>
                <td className="numeric">
                  <Link
                    href={`/complaints/${c.id}`}
                   
                  >
                    {editable ? "Open" : "View"}
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-state">
                  No complaints match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
