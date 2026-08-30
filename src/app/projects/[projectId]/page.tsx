import Link from "next/link";
import { formatCalendarDate } from "@/lib/date";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  computeServiceBucket,
  computeRenewalBucket,
  effectiveAmcEnd,
  SERVICE_BUCKET_LABELS,
  RENEWAL_BUCKET_LABELS,
  type ServiceBucket,
  type RenewalBucket,
} from "@/lib/status";

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
  const { projectId } = await params;
  const sp = await searchParams;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();

  const appSettings = await prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  const search = typeof sp.q === "string" ? sp.q.trim() : "";
  const statusFilter = typeof sp.status === "string" ? sp.status : "";
  const overdueOnly = sp.overdue === "1";
  const renewalOnly = sp.renewal === "1";
  const sortKey = typeof sp.sort === "string" ? sp.sort : "siteName";
  const requestedPage = Math.max(1, Number(sp.page) || 1);

  const allUnits = await prisma.unit.findMany({ where: { projectId } });
  const now = new Date();

  let rows = allUnits.map((unit) => ({
    unit,
    bucket: computeServiceBucket(unit.nextServiceDueDate, now) as ServiceBucket,
    renewalBucket: computeRenewalBucket(effectiveAmcEnd(unit), now, appSettings.renewalAlertLeadDays) as RenewalBucket,
    amcEnd: effectiveAmcEnd(unit),
  }));

  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (r) =>
        (r.unit.siteName ?? "").toLowerCase().includes(s) ||
        (r.unit.contactInfo ?? "").toLowerCase().includes(s)
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
    if (sortKey === "amcEnd") {
      return (a.amcEnd?.getTime() ?? Infinity) - (b.amcEnd?.getTime() ?? Infinity);
    }
    return (a.unit.siteName ?? "").localeCompare(b.unit.siteName ?? "");
  });

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const sortLink = (key: string, label: string) => (
    <Link href={`?${buildQuery(sp, { sort: key, page: undefined })}`} className="hover:text-slate-900">
      {label}
    </Link>
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{project.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} of {allUnits.length} units shown
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <form method="GET" className="flex items-center gap-2">
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          {overdueOnly && <input type="hidden" name="overdue" value="1" />}
          {renewalOnly && <input type="hidden" name="renewal" value="1" />}
          {sortKey !== "siteName" && <input type="hidden" name="sort" value={sortKey} />}
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Search site or contact..."
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
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
          Overdue only
        </FilterLink>
        <FilterLink sp={sp} overrides={{ renewal: renewalOnly ? undefined : "1", page: undefined }} active={renewalOnly}>
          Renewals due
        </FilterLink>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-4 py-2">{sortLink("siteName", "Site")}</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Through</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">{sortLink("nextDue", "Next service")}</th>
              <th className="px-4 py-2">{sortLink("amcEnd", "AMC end")}</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(({ unit, bucket, renewalBucket, amcEnd }) => (
              <tr key={unit.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 font-medium text-slate-900">{unit.siteName ?? "—"}</td>
                <td className="px-4 py-2 text-slate-500">{unit.contactInfo ?? "—"}</td>
                <td className="px-4 py-2 text-slate-500">{unit.through ?? "—"}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={unit.status} manualOverride={unit.statusManualOverride} />
                </td>
                <td className="px-4 py-2">
                  <BucketBadge bucket={bucket} label={SERVICE_BUCKET_LABELS[bucket]} />
                  {unit.nextServiceDueDate && (
                    <span className="ml-1 text-xs text-slate-400">
                      {formatCalendarDate(unit.nextServiceDueDate)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <RenewalBadge bucket={renewalBucket} label={RENEWAL_BUCKET_LABELS[renewalBucket]} />
                  {amcEnd && <span className="ml-1 text-xs text-slate-400">{formatCalendarDate(amcEnd)}</span>}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/projects/${projectId}/units/${unit.id}`}
                    className="text-slate-500 underline hover:text-slate-900"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No units match these filters.
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

function StatusBadge({ status, manualOverride }: { status: string; manualOverride: boolean }) {
  const toneClass = status === "DONE" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}>
      {status}
      {manualOverride && <span title="Manually set">*</span>}
    </span>
  );
}

function BucketBadge({ bucket, label }: { bucket: ServiceBucket; label: string }) {
  const toneClass =
    bucket === "OVERDUE"
      ? "bg-red-100 text-red-700"
      : bucket === "DUE_SOON"
        ? "bg-amber-100 text-amber-700"
        : bucket === "OK"
          ? "bg-green-100 text-green-700"
          : "bg-slate-100 text-slate-500";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}>{label}</span>;
}

function RenewalBadge({ bucket, label }: { bucket: RenewalBucket; label: string }) {
  const toneClass =
    bucket === "EXPIRED"
      ? "bg-red-100 text-red-700"
      : bucket === "EXPIRING_SOON"
        ? "bg-amber-100 text-amber-700"
        : bucket === "OK"
          ? "bg-green-100 text-green-700"
          : "bg-slate-100 text-slate-500";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}>{label}</span>;
}
