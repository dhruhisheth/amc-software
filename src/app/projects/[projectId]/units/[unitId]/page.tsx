import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/auth/guards";
import { canDelete, canEdit } from "@/lib/auth/permissions";
import { formatCalendarDate, toDateInputValue, todayUtcMidnight } from "@/lib/date";
import { computeRenewalBucket, computeServiceBucket, resolveRenewalDueDate } from "@/lib/status";
import { unitInputFromRecord } from "@/lib/units";
import { ServiceBadge, RenewalBadge } from "@/components/Badges";
import UnitEditForm from "./UnitEditForm";
import ServiceHistoryPanel, { type VisitRow } from "./ServiceHistoryPanel";
import DeleteUnitButton from "./DeleteUnitButton";

export default async function UnitPage({
  params,
}: {
  params: Promise<{ projectId: string; unitId: string }>;
}) {
  const session = await requireView();
  const editable = canEdit(session.user.role);
  const deletable = canDelete(session.user.role);

  const { projectId, unitId } = await params;

  const [unit, technicians, appSettings] = await Promise.all([
    prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        project: true,
        visits: { orderBy: { sequence: "asc" }, include: { technician: true } },
      },
    }),
    prisma.technician.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
  ]);
  if (!unit || unit.projectId !== projectId) notFound();

  const now = new Date();
  const renewalDue = resolveRenewalDueDate(unit);
  const serviceBucket = computeServiceBucket(unit.nextServiceDueDate, now);
  const renewalBucket = computeRenewalBucket(renewalDue, now, appSettings.renewalAlertLeadDays);

  const visitRows: VisitRow[] = unit.visits.map((v) => ({
    id: v.id,
    sequence: v.sequence,
    status: v.status,
    visitDate: formatCalendarDate(v.visitDate),
    scheduledDate: formatCalendarDate(v.scheduledDate),
    technicianId: v.technicianId,
    technicianName: v.technician?.name ?? null,
    notes: v.notes,
    rawText: v.rawText,
  }));

  const heading = [unit.block, unit.flatNo].filter(Boolean).join(" / ") || unit.siteName || "Unnamed flat";

  return (
    <div className="app-content narrow">
      <Link href={`/projects/${projectId}`} className="back-link">
        ← Back to {unit.project.name}
      </Link>

      <div className="page-header">
        <div>
          <h1>{heading}</h1>
          <p className="muted">
            {unit.siteName ?? "—"}
            {unit.address && ` · ${unit.address}`}
          </p>
        </div>
        <div className="page-actions">
          <Link
            href={`/complaints/new?unitId=${unit.id}`}
           
          >
            Log complaint
          </Link>
          <Link
            href={`/offers/new?unitId=${unit.id}`}
           
          >
            Generate AMC offer
          </Link>
          {deletable && <DeleteUnitButton unitId={unit.id} />}
        </div>
      </div>

      {/* Service and renewal are shown as two separate cards on purpose — they are two different
          due dates and are meant to be read independently. */}
      <div className="form-grid cols-2">
        <div className="card">
          <h2 className="section-label">Service due</h2>
          <div className="page-actions">
            <ServiceBadge bucket={serviceBucket} />
            <span>
              {formatCalendarDate(unit.nextServiceDueDate) ?? "—"}
            </span>
          </div>
          <p className="cell-sub">
            Last serviced {formatCalendarDate(unit.lastServiceDate) ?? "never"}
          </p>
        </div>
        <div className="card">
          <h2 className="section-label">Renewal due</h2>
          <div className="page-actions">
            <RenewalBadge bucket={renewalBucket} />
            <span>
              {formatCalendarDate(renewalDue) ?? "—"}
            </span>
          </div>
          <p className="cell-sub">
            {unit.renewalDueDateOverride
              ? "Set by hand"
              : `From AMC period${unit.newAmcPeriodText ? " (renewed)" : ""}`}
          </p>
        </div>
      </div>

      <div>
        <UnitEditForm
          unitId={unit.id}
          readOnly={!editable}
          initial={unitInputFromRecord(unit)}
        />
      </div>

      <div>
        <ServiceHistoryPanel
          unitId={unit.id}
          visits={visitRows}
          technicians={technicians.map((t) => ({ id: t.id, name: t.name }))}
          canEditVisits={editable}
          canDeleteVisits={deletable}
          today={toDateInputValue(todayUtcMidnight())}
        />
      </div>
    </div>
  );
}
