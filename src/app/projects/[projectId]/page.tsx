import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCalendarDate } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/auth/guards";
import { canDelete, canEdit } from "@/lib/auth/permissions";
import {
  computeServiceBucket,
  computeRenewalBucket,
  resolveRenewalDueDate,
  type ServiceBucket,
  type RenewalBucket,
} from "@/lib/status";
import { ServiceBadge, RenewalBadge, UnitStatusBadge } from "@/components/Badges";
import { PROJECT_TABLE_SERVICE_SLOTS, serviceDateSlots } from "@/lib/serviceHistory";
import { EditProjectPanel } from "@/app/projects/ProjectForms";
import AddUnitPanel from "./AddUnitPanel";

const PAGE_SIZE = 25;

type SearchParams = Record<string, string | string[] | undefined>;

function buildQuery(current: SearchParams, overrides: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  const merged: SearchParams = { ...current, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === "") continue;
    const str = Array.isArray(value) ? value[0] : value;
    if (str) params.set(key, str);
  }
  return params.toString();
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireView();
  const editable = canEdit(session.user.role);
  const deletable = canDelete(session.user.role);

  const { projectId } = await params;
  const sp = await searchParams;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();

  const appSettings = await prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  const search = typeof sp.q === "string" ? sp.q.trim() : "";
  const statusFilter = typeof sp.status === "string" ? sp.status : "";
  const overdueOnly = sp.overdue === "1";
  const renewalOnly = sp.renewal === "1";
  const sortKey = typeof sp.sort === "string" ? sp.sort : "flat";
  const requestedPage = Math.max(1, Number(sp.page) || 1);

  const allUnits = await prisma.unit.findMany({
    where: { projectId },
    include: { visits: { orderBy: { sequence: "asc" } } },
  });
  const now = new Date();

  let rows = allUnits.map((unit) => {
    const renewalDue = resolveRenewalDueDate(unit);
    return {
      unit,
      bucket: computeServiceBucket(unit.nextServiceDueDate, now) as ServiceBucket,
      renewalDue,
      renewalBucket: computeRenewalBucket(renewalDue, now, appSettings.renewalAlertLeadDays) as RenewalBucket,
      // The four service-date columns: an AMC year on the default 90-day interval is four
      // visits, so four slots show a whole contract year across the row.
      slots: serviceDateSlots(unit.visits),
    };
  });

  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter((r) =>
      [r.unit.siteName, r.unit.block, r.unit.flatNo, r.unit.address, r.unit.through]
        .some((field) => (field ?? "").toLowerCase().includes(s))
    );
  }
  if (statusFilter === "DUE" || statusFilter === "DONE") {
    rows = rows.filter((r) => r.unit.status === statusFilter);
  }
  if (overdueOnly) rows = rows.filter((r) => r.bucket === "OVERDUE");
  if (renewalOnly) rows = rows.filter((r) => r.renewalBucket === "EXPIRED" || r.renewalBucket === "EXPIRING_SOON");

  rows.sort((a, b) => {
    if (sortKey === "nextDue") {
      return (a.unit.nextServiceDueDate?.getTime() ?? Infinity) - (b.unit.nextServiceDueDate?.getTime() ?? Infinity);
    }
    if (sortKey === "renewalDue") {
      return (a.renewalDue?.getTime() ?? Infinity) - (b.renewalDue?.getTime() ?? Infinity);
    }
    if (sortKey === "lastService") {
      return (b.unit.lastServiceDate?.getTime() ?? -Infinity) - (a.unit.lastServiceDate?.getTime() ?? -Infinity);
    }
    if (sortKey === "siteName") {
      return (a.unit.siteName ?? "").localeCompare(b.unit.siteName ?? "");
    }
    // Default: block then flat, the order the sheets are actually read in.
    const byBlock = (a.unit.block ?? "").localeCompare(b.unit.block ?? "", undefined, { numeric: true });
    if (byBlock !== 0) return byBlock;
    return (a.unit.flatNo ?? "").localeCompare(b.unit.flatNo ?? "", undefined, { numeric: true });
  });

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const sortLink = (key: string, label: string) => (
    <Link href={`?${buildQuery(sp, { sort: key, page: undefined })}`} className="hover:text-slate-900">
      {label}
      {sortKey === key && " ↓"}
    </Link>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/projects" className="text-sm text-slate-500 underline hover:text-slate-900">
            ← All projects
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">{project.name}</h1>
          {project.address && <p className="text-sm text-slate-500">{project.address}</p>}
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} of {allUnits.length} flats shown
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/history?projectId=${project.id}`}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Service history
          </Link>
          <Link
            href={`/offers/new?projectId=${project.id}`}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Generate AMC offer
          </Link>
          {editable && (
            <EditProjectPanel
              projectId={project.id}
              initial={{
                name: project.name,
                address: project.address ?? "",
                serviceIntervalDaysOverride:
                  project.serviceIntervalDaysOverride !== null ? String(project.serviceIntervalDaysOverride) : "",
              }}
              canDeleteProject={deletable}
            />
          )}
          {editable && <AddUnitPanel projectId={project.id} />}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <form method="GET" className="flex items-center gap-2">
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          {overdueOnly && <input type="hidden" name="overdue" value="1" />}
          {renewalOnly && <input type="hidden" name="renewal" value="1" />}
          {sortKey !== "flat" && <input type="hidden" name="sort" value={sortKey} />}
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Search block, flat, address, site..."
            className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 text-sm">
          <FilterLink sp={sp} overrides={{ status: undefined, page: undefined }} active={!statusFilter}>
            All
          </FilterLink>
          <FilterLink sp={sp} overrides={{ status: "DUE", page: undefined }} active={statusFilter === "DUE"}>
            Due
          </FilterLink>
          <FilterLink sp={sp} overrides={{ status: "DONE", page: undefined }} active={statusFilter === "DONE"}>
            Done
          </FilterLink>
        </div>

        <FilterLink sp={sp} overrides={{ overdue: overdueOnly ? undefined : "1", page: undefined }} active={overdueOnly}>
          Service overdue only
        </FilterLink>
        <FilterLink sp={sp} overrides={{ renewal: renewalOnly ? undefined : "1", page: undefined }} active={renewalOnly}>
          Renewals due only
        </FilterLink>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="px-3 pt-2" rowSpan={2}>
                {sortLink("flat", "Block / Flat")}
              </th>
              <th className="px-3 pt-2" rowSpan={2}>
                Address
              </th>
              <th className="px-3 pt-2" rowSpan={2}>
                {sortLink("siteName", "Site")}
              </th>
              <th className="px-3 pt-2 text-center" colSpan={PROJECT_TABLE_SERVICE_SLOTS}>
                {sortLink("lastService", "Service dates")}
              </th>
              <th className="px-3 pt-2" rowSpan={2}>
                {sortLink("nextDue", "Service due")}
              </th>
              <th className="px-3 pt-2" rowSpan={2}>
                {sortLink("renewalDue", "Renewal due")}
              </th>
              <th className="px-3 pt-2" rowSpan={2}>
                Status
              </th>
              <th className="px-3 pt-2" rowSpan={2}></th>
            </tr>
            <tr className="border-b border-slate-200 text-left text-xs font-normal text-slate-400">
              {Array.from({ length: PROJECT_TABLE_SERVICE_SLOTS }, (_, i) => (
                <th key={i} className="px-3 pb-2 font-normal">
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(({ unit, bucket, renewalBucket, renewalDue, slots }) => (
              <tr key={unit.id} className="border-b border-slate-100 last:border-0 align-top">
                <td className="px-3 py-2 font-medium text-slate-900">
                  {unit.block ?? "—"}
                  {unit.flatNo && <span className="text-slate-500"> / {unit.flatNo}</span>}
                </td>
                <td className="px-3 py-2 text-slate-500">{unit.address ?? "—"}</td>
                <td className="px-3 py-2 text-slate-700">{unit.siteName ?? "—"}</td>
                {slots.map((slot, i) => (
                  <td
                    key={i}
                    className={`px-3 py-2 text-xs ${
                      slot?.status === "PENDING" ? "text-amber-600" : "text-slate-600"
                    }`}
                    title={slot?.status === "PENDING" ? "Scheduled, not yet done" : undefined}
                  >
                    {slot ? (formatCalendarDate(slot.date) ?? slot.rawText ?? "—") : "—"}
                  </td>
                ))}
                <td className="px-3 py-2">
                  <ServiceBadge bucket={bucket} />
                  {unit.nextServiceDueDate && (
                    <div className="mt-0.5 text-xs text-slate-400">
                      {formatCalendarDate(unit.nextServiceDueDate)}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <RenewalBadge bucket={renewalBucket} />
                  {renewalDue && <div className="mt-0.5 text-xs text-slate-400">{formatCalendarDate(renewalDue)}</div>}
                </td>
                <td className="px-3 py-2">
                  <UnitStatusBadge status={unit.status} manualOverride={unit.statusManualOverride} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/projects/${projectId}/units/${unit.id}`}
                    className="text-slate-500 underline hover:text-slate-900"
                  >
                    {editable ? "Edit" : "View"}
                  </Link>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={7 + PROJECT_TABLE_SERVICE_SLOTS} className="px-4 py-6 text-center text-slate-400">
                  No flats match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <Link
            href={`?${buildQuery(sp, { page: String(Math.max(1, page - 1)) })}`}
            className={`text-slate-500 hover:text-slate-900 ${page <= 1 ? "pointer-events-none opacity-30" : ""}`}
          >
            Previous
          </Link>
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`?${buildQuery(sp, { page: String(Math.min(totalPages, page + 1)) })}`}
            className={`text-slate-500 hover:text-slate-900 ${page >= totalPages ? "pointer-events-none opacity-30" : ""}`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}

function FilterLink({
  sp,
  overrides,
  active,
  children,
}: {
  sp: SearchParams;
  overrides: Record<string, string | undefined>;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`?${buildQuery(sp, overrides)}`}
      className={`rounded-md border px-3 py-1.5 text-sm ${
        active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </Link>
  );
}
