import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/auth/guards";
import { canEdit } from "@/lib/auth/permissions";
import { formatCalendarDate } from "@/lib/date";
import { computeOfferTotals, formatCurrency, OFFER_STATUSES } from "@/lib/offer";
import { unitLabel } from "@/lib/units";
import { OfferStatusBadge, OFFER_STATUS_LABELS } from "@/components/Badges";
import type { OfferStatus } from "@/generated/prisma/enums";

type SearchParams = Record<string, string | string[] | undefined>;

/** The AMC offer history — every offer generated, newest first. */
export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireView();
  const editable = canEdit(session.user.role);
  const sp = await searchParams;

  const statusFilter = typeof sp.status === "string" ? sp.status : "";
  const projectFilter = typeof sp.projectId === "string" ? sp.projectId : "";

  const [offers, projects] = await Promise.all([
    prisma.amcOffer.findMany({
      where: {
        ...(OFFER_STATUSES.includes(statusFilter as OfferStatus)
          ? { status: statusFilter as OfferStatus }
          : {}),
        ...(projectFilter ? { projectId: projectFilter } : {}),
      },
      orderBy: { offerDate: "desc" },
      include: { project: true, unit: true, items: true, createdBy: true },
    }),
    prisma.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">AMC offers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every offer generated, and what became of it. {offers.length} shown.
          </p>
        </div>
        {editable && (
          <Link
            href="/offers/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Generate offer
          </Link>
        )}
      </div>

      <form method="GET" className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block font-medium text-slate-700">Project</span>
          <select
            name="projectId"
            defaultValue={projectFilter}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block font-medium text-slate-700">Status</span>
          <select
            name="status"
            defaultValue={statusFilter}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {OFFER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {OFFER_STATUS_LABELS[s]}
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
              <th className="px-3 py-2">Offer no</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">For</th>
              <th className="px-3 py-2">Lines</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => {
              const totals = computeOfferTotals(offer.items, offer.taxPercent);
              return (
                <tr key={offer.id} className="border-b border-slate-100 align-top last:border-0">
                  <td className="px-3 py-2 font-medium text-slate-900">{offer.offerNo}</td>
                  <td className="px-3 py-2 text-slate-500">{formatCalendarDate(offer.offerDate)}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {offer.customerName}
                    <div className="text-xs text-slate-400">by {offer.createdBy.name}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {offer.unit ? unitLabel(offer.unit) : (offer.project?.name ?? "—")}
                    <div className="text-xs text-slate-400">
                      {offer.unit ? "Flat-wise" : offer.project ? "Project-wise" : "Standalone"}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{offer.items.length}</td>
                  <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(totals.total)}</td>
                  <td className="px-3 py-2">
                    <OfferStatusBadge status={offer.status} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/offers/${offer.id}`}
                      className="text-slate-500 underline hover:text-slate-900"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
            {offers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  No offers yet. Generate one from a project or a flat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
