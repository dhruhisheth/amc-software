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
      include: { project: true, unit: true, technician: true, technician2: true },
    }),
    loadPickerOptions(),
  ]);
  if (!complaint) notFound();

  // A technician who has since been deactivated still needs to appear, or reopening the form
  // would silently unassign them.
  const technicians = [...options.technicians];
  for (const assigned of [complaint.technician, complaint.technician2]) {
    if (assigned && !technicians.some((t) => t.id === assigned.id)) {
      technicians.push({ id: assigned.id, name: `${assigned.name} (inactive)` });
    }
  }

  return (
    <div className="app-content narrow">
      <Link href="/complaints" className="back-link">
        ← All complaints
      </Link>

      <div className="page-header">
        <div>
          <h1>{complaint.ticketNo}</h1>
          <p className="muted">{complaint.subject}</p>
          <div className="page-actions">
            <ComplaintStatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
          </div>
        </div>
        {deletable && <DeleteComplaintButton complaintId={complaint.id} />}
      </div>

      <dl className="card form-grid cols-4">
        <div>
          <dt className="section-label">Reported</dt>
          <dd>{formatCalendarDate(complaint.reportedAt) ?? "—"}</dd>
        </div>
        <div>
          <dt className="section-label">Attended</dt>
          <dd>{formatCalendarDate(complaint.attendedAt) ?? "—"}</dd>
        </div>
        <div>
          <dt className="section-label">Resolved</dt>
          <dd>{formatCalendarDate(complaint.resolvedAt) ?? "—"}</dd>
        </div>
        <div>
          <dt className="section-label">Flat</dt>
          <dd>
            {complaint.unit ? (
              <Link
                href={`/projects/${complaint.unit.projectId}/units/${complaint.unit.id}`}
               
              >
                {unitLabel(complaint.unit)}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>

      <div>
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
            technician2Id: complaint.technician2Id ?? "",
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
