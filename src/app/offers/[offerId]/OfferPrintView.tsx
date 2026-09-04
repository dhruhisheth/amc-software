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
    <div className="mt-6 rounded-lg border border-slate-200 bg-white p-8 print:border-0 print:p-0 print:shadow-none">
      <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{company.name}</h2>
          {company.address && <p className="mt-0.5 text-xs text-slate-500">{company.address}</p>}
          <p className="text-xs text-slate-500">
            {[company.phone, company.email].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-400">AMC Offer</p>
          <p className="font-semibold text-slate-900">{offer.offerNo}</p>
          <p className="text-xs text-slate-500">Date: {offer.offerDate}</p>
          {offer.validUntil && <p className="text-xs text-slate-500">Valid until: {offer.validUntil}</p>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">To</p>
          <p className="font-medium text-slate-900">{offer.customerName}</p>
          {offer.customerAddress && <p className="text-slate-600">{offer.customerAddress}</p>}
          {offer.scope && <p className="mt-1 text-xs text-slate-500">For: {offer.scope}</p>}
        </div>
        {(offer.periodStart || offer.periodEnd) && (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">AMC period</p>
            <p className="text-slate-700">
              {offer.periodStart ?? "—"} to {offer.periodEnd ?? "—"}
            </p>
          </div>
        )}
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-y border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-2 font-medium">#</th>
            <th className="py-2 pr-2 font-medium">Description</th>
            <th className="py-2 pr-2 font-medium">HP</th>
            <th className="py-2 pr-2 font-medium">Qty</th>
            <th className="py-2 pr-2 text-right font-medium">Rate</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.sequence} className="border-b border-slate-100">
              <td className="py-2 pr-2 text-slate-500">{item.sequence}</td>
              <td className="py-2 pr-2 text-slate-800">{item.description}</td>
              <td className="py-2 pr-2 text-slate-600">{item.hp ?? "—"}</td>
              <td className="py-2 pr-2 text-slate-600">{item.quantity}</td>
              <td className="py-2 pr-2 text-right text-slate-600">{formatCurrency(item.unitRate)}</td>
              <td className="py-2 text-right text-slate-800">
                {formatCurrency(item.quantity * item.unitRate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <dl className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Subtotal</dt>
            <dd className="text-slate-700">{formatCurrency(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Tax ({offer.taxPercent}%)</dt>
            <dd className="text-slate-700">{formatCurrency(totals.tax)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-300 pt-1 text-base font-semibold">
            <dt className="text-slate-800">Total</dt>
            <dd className="text-slate-900">{formatCurrency(totals.total)}</dd>
          </div>
        </dl>
      </div>

      {offer.notes && (
        <div className="mt-6 text-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-slate-600">{offer.notes}</p>
        </div>
      )}
      {offer.termsText && (
        <div className="mt-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Terms &amp; conditions</p>
          <p className="mt-1 whitespace-pre-wrap text-slate-600">{offer.termsText}</p>
        </div>
      )}

      <div className="mt-8 flex items-end justify-between text-sm">
        <p className="text-xs text-slate-400">Prepared by {offer.preparedBy}</p>
        <div className="text-right">
          <div className="h-10" />
          <p className="border-t border-slate-300 pt-1 text-xs text-slate-500">For {company.name}</p>
        </div>
      </div>

      <div className="mt-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
