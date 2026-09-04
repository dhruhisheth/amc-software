import type { OfferStatus } from "@/generated/prisma/enums";

export const OFFER_STATUSES: OfferStatus[] = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

export interface OfferItemLike {
  quantity: number;
  unitRate: number;
}

export interface OfferTotals {
  subtotal: number;
  tax: number;
  total: number;
}

export function computeOfferTotals(items: OfferItemLike[], taxPercent: number): OfferTotals {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitRate, 0);
  const tax = subtotal * (taxPercent / 100);
  return { subtotal, tax, total: subtotal + tax };
}

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return INR.format(Number.isFinite(amount) ? amount : 0);
}

/**
 * Offer numbers are `AMC/<financial year>/<4-digit serial>`, e.g. `AMC/2026-27/0007`.
 * The serial is scoped to the financial year, so it restarts each April.
 */
export function financialYearLabel(date: Date): string {
  const year = date.getUTCFullYear();
  const startYear = date.getUTCMonth() >= 3 ? year : year - 1; // April (month 3) starts the FY
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function buildOfferNo(date: Date, serial: number): string {
  return `AMC/${financialYearLabel(date)}/${String(serial).padStart(4, "0")}`;
}

export function offerNoPrefix(date: Date): string {
  return `AMC/${financialYearLabel(date)}/`;
}

/** Next serial given the highest existing offer number for the same financial year. */
export function nextOfferSerial(latestOfferNo: string | null): number {
  if (!latestOfferNo) return 1;
  const serial = Number(latestOfferNo.split("/").pop());
  return Number.isFinite(serial) ? serial + 1 : 1;
}
