import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/auth/guards";
import { canDelete, canEdit } from "@/lib/auth/permissions";
import { formatCalendarDate, toDateInputValue } from "@/lib/date";
import { computeOfferTotals, formatCurrency } from "@/lib/offer";
import { unitLabel } from "@/lib/units";
import { OfferStatusBadge } from "@/components/Badges";
import { OfferForm, DeleteOfferButton } from "../OfferForms";
import OfferPrintView from "./OfferPrintView";

export default async function OfferPage({ params }: { params: Promise<{ offerId: string }> }) {
  const session = await requireView();
  const editable = canEdit(session.user.role);
  const deletable = canDelete(session.user.role);

  const { offerId } = await params;

  const [offer, projects, appSettings] = await Promise.all([
    prisma.amcOffer.findUnique({
      where: { id: offerId },
      include: {
        project: true,
        unit: true,
        createdBy: true,
        items: { orderBy: { sequence: "asc" } },
      },
    }),
    prisma.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
  ]);
  if (!offer) notFound();

  const totals = computeOfferTotals(offer.items, offer.taxPercent);

  return (
    <div className="app-content narrow">
      <div className="no-print">
        <Link href="/offers" className="back-link">
          ← All AMC offers
        </Link>

        <div className="page-header">
          <div>
            <h1>{offer.offerNo}</h1>
            <p className="muted">
              {offer.customerName} ·{" "}
              {offer.unit ? unitLabel(offer.unit) : (offer.project?.name ?? "Standalone")} ·{" "}
              {formatCurrency(totals.total)}
            </p>
            <div>
              <OfferStatusBadge status={offer.status} />
            </div>
          </div>
          <div className="page-actions">
            {deletable && <DeleteOfferButton offerId={offer.id} />}
          </div>
        </div>
      </div>

      {/* The printable offer itself. Everything else on the page is hidden when printing, so
          "Print / Save as PDF" produces the document that goes to the customer. */}
      <OfferPrintView
        company={{
          name: appSettings.companyName,
          address: appSettings.companyAddress,
          phone: appSettings.companyPhone,
          email: appSettings.companyEmail,
        }}
        offer={{
          offerNo: offer.offerNo,
          offerDate: formatCalendarDate(offer.offerDate) ?? "",
          validUntil: formatCalendarDate(offer.validUntil),
          periodStart: formatCalendarDate(offer.periodStart),
          periodEnd: formatCalendarDate(offer.periodEnd),
          customerName: offer.customerName,
          customerAddress: offer.customerAddress,
          scope: offer.unit ? unitLabel(offer.unit) : (offer.project?.name ?? null),
          notes: offer.notes,
          termsText: offer.termsText,
          taxPercent: offer.taxPercent,
          preparedBy: offer.createdBy.name,
        }}
        items={offer.items.map((item) => ({
          sequence: item.sequence,
          description: item.description,
          hp: item.hp,
          quantity: item.quantity,
          unitRate: item.unitRate,
        }))}
        totals={totals}
      />

      <div className="no-print">
        <h2 className="section-label">Edit this offer</h2>
        <div>
          <OfferForm
            mode="edit"
            offerId={offer.id}
            readOnly={!editable}
            projects={projects}
            initial={{
              projectId: offer.projectId ?? "",
              unitId: offer.unitId ?? "",
              customerName: offer.customerName,
              customerAddress: offer.customerAddress ?? "",
              offerDate: toDateInputValue(offer.offerDate),
              validUntil: toDateInputValue(offer.validUntil),
              periodStart: toDateInputValue(offer.periodStart),
              periodEnd: toDateInputValue(offer.periodEnd),
              taxPercent: String(offer.taxPercent),
              notes: offer.notes ?? "",
              termsText: offer.termsText ?? "",
              status: offer.status,
              items: offer.items.map((item) => ({
                description: item.description,
                hp: item.hp !== null ? String(item.hp) : "",
                quantity: String(item.quantity),
                unitRate: String(item.unitRate),
              })),
            }}
          />
        </div>
      </div>
    </div>
  );
}
