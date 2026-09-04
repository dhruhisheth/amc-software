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
    <div className="app-content">
      <div className="page-header">
        <div>
          <h1>AMC offers</h1>
          <p className="muted">
            Every offer generated, and what became of it. {offers.length} shown.
          </p>
        </div>
        {editable && (
          <Link
            href="/offers/new"
            className="primary"
          >
            Generate offer
          </Link>
        )}
      </div>

      <form method="GET" className="filters">
        <label className="field">
          <span className="field-label">Project</span>
          <select
            name="projectId"
            defaultValue={projectFilter}
           
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Status</span>
          <select
            name="status"
            defaultValue={statusFilter}
           
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
         
        >
          Apply
        </button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Offer no</th>
              <th>Date</th>
              <th>Customer</th>
              <th>For</th>
              <th>Lines</th>
              <th className="numeric">Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => {
              const totals = computeOfferTotals(offer.items, offer.taxPercent);
              return (
                <tr key={offer.id}>
                  <td className="cell-strong">{offer.offerNo}</td>
                  <td className="muted">{formatCalendarDate(offer.offerDate)}</td>
                  <td>
                    {offer.customerName}
                    <div className="cell-sub">by {offer.createdBy.name}</div>
                  </td>
                  <td className="muted">
                    {offer.unit ? unitLabel(offer.unit) : (offer.project?.name ?? "—")}
                    <div className="cell-sub">
                      {offer.unit ? "Flat-wise" : offer.project ? "Project-wise" : "Standalone"}
                    </div>
                  </td>
                  <td className="muted">{offer.items.length}</td>
                  <td className="numeric">{formatCurrency(totals.total)}</td>
                  <td>
                    <OfferStatusBadge status={offer.status} />
                  </td>
                  <td className="numeric">
                    <Link
                      href={`/offers/${offer.id}`}
                     
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
            {offers.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-state">
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
