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
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <Link href={`/projects/${projectId}`} className="text-sm text-slate-500 underline hover:text-slate-900">
        ← Back to {unit.project.name}
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{heading}</h1>
          <p className="text-sm text-slate-500">
            {unit.siteName ?? "—"}
            {unit.address && ` · ${unit.address}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/complaints/new?unitId=${unit.id}`}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Log complaint
          </Link>
          <Link
            href={`/offers/new?unitId=${unit.id}`}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Generate AMC offer
          </Link>
          {deletable && <DeleteUnitButton unitId={unit.id} />}
        </div>
      </div>

      {/* Service and renewal are shown as two separate cards on purpose — they are two different
          due dates and are meant to be read independently. */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Service due</h2>
          <div className="mt-2 flex items-center gap-2">
            <ServiceBadge bucket={serviceBucket} />
            <span className="text-lg font-semibold text-slate-900">
              {formatCalendarDate(unit.nextServiceDueDate) ?? "—"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Last serviced {formatCalendarDate(unit.lastServiceDate) ?? "never"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Renewal due</h2>
          <div className="mt-2 flex items-center gap-2">
            <RenewalBadge bucket={renewalBucket} />
            <span className="text-lg font-semibold text-slate-900">
              {formatCalendarDate(renewalDue) ?? "—"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {unit.renewalDueDateOverride
              ? "Set by hand"
              : `From AMC period${unit.newAmcPeriodText ? " (renewed)" : ""}`}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <UnitEditForm
          unitId={unit.id}
          readOnly={!editable}
          initial={unitInputFromRecord(unit)}
        />
      </div>

      <div className="mt-6">
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
