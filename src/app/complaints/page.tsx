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
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Complaints</h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} complaints · {openCount} still open · {unassignedCount} unassigned
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/complaints/technicians"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Technicians
          </Link>
          {editable && (
            <Link
              href="/complaints/new"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Log complaint
            </Link>
          )}
        </div>
      </div>

      <form method="GET" className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block font-medium text-slate-700">Search</span>
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Ticket, subject, name..."
            className="mt-1 w-56 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block font-medium text-slate-700">Status</span>
          <select
            name="status"
            defaultValue={statusFilter}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {COMPLAINT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {COMPLAINT_STATUS_LABELS[st]}
              </option>
            ))}
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
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
        >
          Apply
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-3 py-2">Ticket</th>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2">Project / Flat</th>
              <th className="px-3 py-2">Reported</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Technician attending</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 align-top last:border-0">
                <td className="px-3 py-2 font-medium text-slate-900">{c.ticketNo}</td>
                <td className="px-3 py-2 text-slate-700">
                  {c.subject}
                  {c.complainantName && (
                    <div className="text-xs text-slate-400">{c.complainantName}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {c.project?.name ?? "—"}
                  {c.unit && <div className="text-xs text-slate-400">{unitLabel(c.unit)}</div>}
                </td>
                <td className="px-3 py-2 text-slate-500">{formatCalendarDate(c.reportedAt) ?? "—"}</td>
                <td className="px-3 py-2">
                  <PriorityBadge priority={c.priority} />
                </td>
                <td className="px-3 py-2">
                  <AssignTechnicianSelect
                    complaintId={c.id}
                    technicianId={c.technicianId}
                    technicians={technicians.map((t) => ({ id: t.id, name: t.name }))}
                    disabled={!editable}
                  />
                </td>
                <td className="px-3 py-2">
                  <ComplaintStatusBadge status={c.status} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/complaints/${c.id}`}
                    className="text-slate-500 underline hover:text-slate-900"
                  >
                    {editable ? "Open" : "View"}
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
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
