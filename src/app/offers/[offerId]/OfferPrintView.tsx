"use client";

import { formatCurrency } from "@/lib/offer";
import type { OfferTotals } from "@/lib/offer";

interface CompanyDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
}

interface OfferDetails {
  offerNo: string;
  offerDate: string;
  validUntil: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  customerName: string;
  customerAddress: string | null;
  scope: string | null;
  notes: string | null;
  termsText: string | null;
  taxPercent: number;
  preparedBy: string;
}

interface OfferItemRow {
  sequence: number;
  description: string;
  hp: number | null;
  quantity: number;
  unitRate: number;
}

/**
 * The offer document itself. Printing the page (or saving it as a PDF) yields exactly this —
 * `print:hidden` on everything else in the page keeps the app chrome out of the output.
 */
export default function OfferPrintView({
  company,
  offer,
  items,
  totals,
}: {
  company: CompanyDetails;
  offer: OfferDetails;
  items: OfferItemRow[];
  totals: OfferTotals;
}) {
  return (
    <div className="offer-doc">
      <div className="offer-doc-header">
        <div>
          <h2>{company.name}</h2>
          {company.address && <p className="cell-sub">{company.address}</p>}
          <p className="cell-sub">
            {[company.phone, company.email].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="text-right">
          <p className="section-label">AMC Offer</p>
          <p>{offer.offerNo}</p>
          <p className="cell-sub">Date: {offer.offerDate}</p>
          {offer.validUntil && <p className="cell-sub">Valid until: {offer.validUntil}</p>}
        </div>
      </div>

      <div className="form-grid cols-2">
        <div>
          <p className="section-label">To</p>
          <p className="cell-strong">{offer.customerName}</p>
          {offer.customerAddress && <p>{offer.customerAddress}</p>}
          {offer.scope && <p className="cell-sub">For: {offer.scope}</p>}
        </div>
        {(offer.periodStart || offer.periodEnd) && (
          <div className="text-right">
            <p className="section-label">AMC period</p>
            <p>
              {offer.periodStart ?? "—"} to {offer.periodEnd ?? "—"}
            </p>
          </div>
        )}
      </div>

      <table>
        <thead>
          <tr>
            <th className="field-label">#</th>
            <th className="field-label">Description</th>
            <th className="field-label">HP</th>
            <th className="field-label">Qty</th>
            <th className="numeric field-label">Rate</th>
            <th className="numeric field-label">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.sequence}>
              <td className="muted">{item.sequence}</td>
              <td>{item.description}</td>
              <td>{item.hp ?? "—"}</td>
              <td>{item.quantity}</td>
              <td className="numeric">{formatCurrency(item.unitRate)}</td>
              <td className="numeric">
                {formatCurrency(item.quantity * item.unitRate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="offer-totals">
        <dl>
          <div className="row">
            <dt className="muted">Subtotal</dt>
            <dd>{formatCurrency(totals.subtotal)}</dd>
          </div>
          <div className="row">
            <dt className="muted">Tax ({offer.taxPercent}%)</dt>
            <dd>{formatCurrency(totals.tax)}</dd>
          </div>
          <div className="row total">
            <dt>Total</dt>
            <dd>{formatCurrency(totals.total)}</dd>
          </div>
        </dl>
      </div>

      {offer.notes && (
        <div>
          <p className="section-label">Notes</p>
          <p className="whitespace-preserve">{offer.notes}</p>
        </div>
      )}
      {offer.termsText && (
        <div>
          <p className="section-label">Terms &amp; conditions</p>
          <p className="whitespace-preserve">{offer.termsText}</p>
        </div>
      )}

      <div className="offer-signature">
        <p className="cell-sub">Prepared by {offer.preparedBy}</p>
        <div className="text-right">
          <div className="h-10" />
          <p className="offer-signature-line">For {company.name}</p>
        </div>
      </div>

      <div className="no-print">
        <button
          onClick={() => window.print()}
         
        >
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
