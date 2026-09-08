"use client";

import { amountInWords, formatCurrency, lineAmount } from "@/lib/offer";
import type { OfferTotals } from "@/lib/offer";

interface CompanyDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
  signatory: string;
  cityLine: string;
  stateLine: string;
  introText: string;
  footerNote: string;
}

interface OfferDetails {
  offerNo: string;
  offerDate: string;
  customerName: string;
  customerAddress: string | null;
  siteAddress: string | null;
  systemHeading: string | null;
  hsnCode: string | null;
  contractTerm: string | null;
  amcPeriodText: string | null;
  taxPercent: number;
  notes: string | null;
  termsText: string | null;
}

interface OfferItemRow {
  sequence: number;
  description: string;
  hp: number | null;
  unitRate: number;
}

/**
 * The AMC offer document, laid out to match the company's existing offer (the LA MARINA
 * B1-901 sheet): letterhead, To/Site Address, the covering sentence, a
 * Description / HP / Rate per HP / Grand Total table, Sub Total, GST, Net Amount, the amount in
 * words, contract period, payment block and signature lines.
 *
 * Printing the page yields exactly this — everything else on the page is `.no-print`.
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
      <div className="offer-letterhead">
        <h2 className="offer-company">{company.name}</h2>
        <p className="offer-doc-title">ANNUAL MAINTENANCE CONTRACT OFFER</p>
        {company.address && <p className="offer-company-address">{company.address}</p>}
      </div>

      <div className="offer-meta">
        <div>
          <p className="offer-meta-label">To</p>
          <p className="offer-meta-strong">{offer.customerName}</p>
          {offer.customerAddress && <p>{offer.customerAddress}</p>}
        </div>
        <div>
          <p>
            <span className="offer-meta-label">AMC offer No:</span> {offer.offerNo}
          </p>
          <p>
            <span className="offer-meta-label">Date:</span> {offer.offerDate}
          </p>
          {offer.siteAddress && (
            <p>
              <span className="offer-meta-label">Site Address:</span> {offer.siteAddress}
            </p>
          )}
        </div>
      </div>

      <p className="offer-intro">
        Dear Sir,
        <br />
        {company.introText}
      </p>

      <table className="offer-items">
        <thead>
          <tr>
            <th>Description</th>
            <th className="numeric">HP</th>
            <th className="numeric">Rate/HP</th>
            <th className="numeric">Grand Total</th>
          </tr>
        </thead>
        <tbody>
          {offer.systemHeading && (
            <tr>
              <td colSpan={4} className="offer-system-heading">
                {offer.systemHeading}
              </td>
            </tr>
          )}
          {offer.amcPeriodText && (
            <tr>
              <td colSpan={4} className="offer-period-label">
                AMC Period: {offer.amcPeriodText}
              </td>
            </tr>
          )}
          {items.map((item) => (
            <tr key={item.sequence}>
              <td>{item.description}</td>
              <td className="numeric">{item.hp ?? "—"}</td>
              <td className="numeric">{formatCurrency(item.unitRate)}</td>
              <td className="numeric">{formatCurrency(lineAmount(item))}</td>
            </tr>
          ))}
          {offer.hsnCode && (
            <tr>
              <td colSpan={4} className="offer-hsn">
                HSN/SAC CODE - {offer.hsnCode}
              </td>
            </tr>
          )}
          <tr>
            <td colSpan={3} className="numeric">
              Sub Total
            </td>
            <td className="numeric">{formatCurrency(totals.subtotal)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="numeric">
              GST RATE {offer.taxPercent}%
            </td>
            <td className="numeric">{formatCurrency(totals.tax)}</td>
          </tr>
          <tr className="offer-net">
            <td colSpan={3} className="numeric">
              Net Amount
            </td>
            <td className="numeric">{formatCurrency(totals.total)}</td>
          </tr>
        </tbody>
      </table>

      <p className="offer-words">
        <span className="offer-meta-label">Total Amount In Word:</span>{" "}
        {amountInWords(totals.total)}
      </p>

      <div className="offer-blocks">
        <div>
          <p className="offer-meta-label">Company Details</p>
          {offer.amcPeriodText && <p>Contract Period: {offer.amcPeriodText}</p>}
          {offer.contractTerm && <p>{offer.contractTerm}</p>}

          <p className="offer-meta-label offer-payment-label">PAYMENT</p>
          <table className="offer-payment">
            <tbody>
              {["Cheque / DD No.", "Cheque / DD Date", "Cheque / DD Amount", "TDS Deduction", "TIN/VAT No."].map(
                (label) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td className="offer-payment-blank" />
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="offer-signoff">
          <p>FOR,</p>
          <p className="offer-meta-strong">{company.name}</p>
          <p>{company.signatory}</p>
          <p>{company.cityLine}</p>
          <p>{company.stateLine}</p>
          {company.phone && <p>Ph: {company.phone}</p>}
          {company.email && <p>{company.email}</p>}
          <p className="offer-signature-line">(Customer&apos;s Signature with stamp)</p>
        </div>
      </div>

      {offer.notes && (
        <p className="whitespace-preserve offer-note">
          <span className="offer-meta-label">Notes:</span> {offer.notes}
        </p>
      )}
      {offer.termsText && <p className="whitespace-preserve offer-note">{offer.termsText}</p>}

      <p className="offer-footer-note">{company.footerNote}</p>

      <div className="no-print offer-print-actions">
        <button className="primary" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
