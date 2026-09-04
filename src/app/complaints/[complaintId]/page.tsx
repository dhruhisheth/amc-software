import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/auth/guards";
import { canDelete, canEdit } from "@/lib/auth/permissions";
import { formatCalendarDate, toDateInputValue } from "@/lib/date";
import { loadPickerOptions } from "@/lib/complaintOptions";
import { unitLabel } from "@/lib/units";
import { ComplaintStatusBadge, PriorityBadge } from "@/components/Badges";
import { ComplaintForm, DeleteComplaintButton } from "../ComplaintForms";

export default async function ComplaintPage({
  params,
}: {
  params: Promise<{ complaintId: string }>;
}) {
  const session = await requireView();
  const editable = canEdit(session.user.role);
  const deletable = canDelete(session.user.role);

  const { complaintId } = await params;

  const [complaint, options] = await Promise.all([
    prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { project: true, unit: true, technician: true },
    }),
    loadPickerOptions(),
  ]);
  if (!complaint) notFound();

  // A technician who has since been deactivated still needs to appear, or reopening the form
  // would silently unassign them.
  const technicians =
    complaint.technician && !options.technicians.some((t) => t.id === complaint.technicianId)
      ? [...options.technicians, { id: complaint.technician.id, name: `${complaint.technician.name} (inactive)` }]
      : options.technicians;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link href="/complaints" className="text-sm text-slate-500 underline hover:text-slate-900">
        ← All complaints
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{complaint.ticketNo}</h1>
          <p className="mt-1 text-sm text-slate-500">{complaint.subject}</p>
          <div className="mt-2 flex items-center gap-2">
            <ComplaintStatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
          </div>
        </div>
        {deletable && <DeleteComplaintButton complaintId={complaint.id} />}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Reported</dt>
          <dd className="mt-0.5 text-slate-700">{formatCalendarDate(complaint.reportedAt) ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Attended</dt>
          <dd className="mt-0.5 text-slate-700">{formatCalendarDate(complaint.attendedAt) ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Resolved</dt>
          <dd className="mt-0.5 text-slate-700">{formatCalendarDate(complaint.resolvedAt) ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Flat</dt>
          <dd className="mt-0.5 text-slate-700">
            {complaint.unit ? (
              <Link
                href={`/projects/${complaint.unit.projectId}/units/${complaint.unit.id}`}
                className="underline hover:text-slate-900"
              >
                {unitLabel(complaint.unit)}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <ComplaintForm
          mode="edit"
          complaintId={complaint.id}
          readOnly={!editable}
          initial={{
            projectId: complaint.projectId ?? "",
            unitId: complaint.unitId ?? "",
            complainantName: complaint.complainantName ?? "",
            contactNumber: complaint.contactNumber ?? "",
            subject: complaint.subject,
            description: complaint.description ?? "",
            priority: complaint.priority,
            technicianId: complaint.technicianId ?? "",
            status: complaint.status,
            attendedAt: toDateInputValue(complaint.attendedAt),
            resolvedAt: toDateInputValue(complaint.resolvedAt),
            resolutionNotes: complaint.resolutionNotes ?? "",
          }}
          projects={options.projects}
          units={options.units}
          technicians={technicians}
        />
      </div>
    </div>
  );
}
