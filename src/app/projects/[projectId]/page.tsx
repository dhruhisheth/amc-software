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
    <Link href={`?${buildQuery(sp, { sort: key, page: undefined })}`}>
      {label}
      {sortKey === key && " \u2193"}
    </Link>
  );

  return (
    <main className="app-content">
      <div className="page">
        <div className="page-header">
          <div>
            <Link href="/projects" className="back-link">
              &larr; All projects
            </Link>
            <h2>{project.name}</h2>
            {project.address && <p>{project.address}</p>}
            <p>
              {rows.length} of {allUnits.length} flats shown
            </p>
          </div>
          <div className="page-actions">
            <Link className="button" href={`/history?projectId=${project.id}`}>
              Service history
            </Link>
            <Link className="button" href={`/offers/new?projectId=${project.id}`}>
              Generate AMC offer
            </Link>
            {editable && (
              <EditProjectPanel
                projectId={project.id}
                initial={{
                  name: project.name,
                  address: project.address ?? "",
                  serviceIntervalDaysOverride:
                    project.serviceIntervalDaysOverride !== null
                      ? String(project.serviceIntervalDaysOverride)
                      : "",
                }}
                canDeleteProject={deletable}
              />
            )}
            {editable && <AddUnitPanel projectId={project.id} />}
          </div>
        </div>

        <div className="filters">
          <form method="GET" className="filters">
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            {overdueOnly && <input type="hidden" name="overdue" value="1" />}
            {renewalOnly && <input type="hidden" name="renewal" value="1" />}
            {sortKey !== "flat" && <input type="hidden" name="sort" value={sortKey} />}
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Search block, flat, address, site..."
            />
            <button type="submit">Search</button>
          </form>

          <div className="filter-chips">
            <FilterLink sp={sp} overrides={{ status: undefined, page: undefined }} active={!statusFilter}>
              All
            </FilterLink>
            <FilterLink sp={sp} overrides={{ status: "DUE", page: undefined }} active={statusFilter === "DUE"}>
              Due
            </FilterLink>
            <FilterLink sp={sp} overrides={{ status: "DONE", page: undefined }} active={statusFilter === "DONE"}>
              Done
            </FilterLink>
            <FilterLink
              sp={sp}
              overrides={{ overdue: overdueOnly ? undefined : "1", page: undefined }}
              active={overdueOnly}
            >
              Service overdue only
            </FilterLink>
            <FilterLink
              sp={sp}
              overrides={{ renewal: renewalOnly ? undefined : "1", page: undefined }}
              active={renewalOnly}
            >
              Renewals due only
            </FilterLink>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th rowSpan={2}>{sortLink("flat", "Block / Flat")}</th>
                <th rowSpan={2}>Address</th>
                <th rowSpan={2}>{sortLink("siteName", "Site")}</th>
                <th colSpan={PROJECT_TABLE_SERVICE_SLOTS}>{sortLink("lastService", "Service dates")}</th>
                <th rowSpan={2}>{sortLink("nextDue", "Service due")}</th>
                <th rowSpan={2}>{sortLink("renewalDue", "Renewal due")}</th>
                <th rowSpan={2}>Status</th>
                <th rowSpan={2}></th>
              </tr>
              <tr className="head-sub">
                {Array.from({ length: PROJECT_TABLE_SERVICE_SLOTS }, (_, i) => (
                  <th key={i}>{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map(({ unit, bucket, renewalBucket, renewalDue, slots }) => (
                <tr key={unit.id}>
                  <td className="cell-strong">
                    {unit.block ?? "\u2014"}
                    {unit.flatNo && <span className="muted"> / {unit.flatNo}</span>}
                  </td>
                  <td className="muted">{unit.address ?? "\u2014"}</td>
                  <td>{unit.siteName ?? "\u2014"}</td>
                  {slots.map((slot, i) => (
                    <td
                      key={i}
                      className={slot?.status === "PENDING" ? "cell-sub cell-pending" : "cell-sub"}
                      title={slot?.status === "PENDING" ? "Scheduled, not yet done" : undefined}
                    >
                      {slot ? (formatCalendarDate(slot.date) ?? slot.rawText ?? "\u2014") : "\u2014"}
                    </td>
                  ))}
                  <td>
                    <ServiceBadge bucket={bucket} />
                    {unit.nextServiceDueDate && (
                      <div className="cell-sub">{formatCalendarDate(unit.nextServiceDueDate)}</div>
                    )}
                  </td>
                  <td>
                    <RenewalBadge bucket={renewalBucket} />
                    {renewalDue && <div className="cell-sub">{formatCalendarDate(renewalDue)}</div>}
                  </td>
                  <td>
                    <UnitStatusBadge status={unit.status} manualOverride={unit.statusManualOverride} />
                  </td>
                  <td className="numeric">
                    <Link href={`/projects/${projectId}/units/${unit.id}`}>
                      {editable ? "Edit" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={7 + PROJECT_TABLE_SERVICE_SLOTS} className="empty-state">
                    No flats match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <Link
              href={`?${buildQuery(sp, { page: String(Math.max(1, page - 1)) })}`}
              className={page <= 1 ? "disabled" : undefined}
            >
              Previous
            </Link>
            <span>
              Page {page} of {totalPages}
            </span>
            <Link
              href={`?${buildQuery(sp, { page: String(Math.min(totalPages, page + 1)) })}`}
              className={page >= totalPages ? "disabled" : undefined}
            >
              Next
            </Link>
          </div>
        )}
      </div>
    </main>
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
    <Link href={`?${buildQuery(sp, overrides)}`} className={active ? "chip active" : "chip"}>
      {children}
    </Link>
  );
}
