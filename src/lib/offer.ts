import type { OfferStatus } from "@/generated/prisma/enums";

export const OFFER_STATUSES: OfferStatus[] = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

/**
 * A line on the offer is priced the way the company's existing offer document prices it:
 * HP multiplied by a rate per HP, e.g. 10 HP at 2,500/HP = 25,000. There is no quantity column.
 */
export interface OfferItemLike {
  hp: number | null;
  unitRate: number;
}

export interface OfferTotals {
  subtotal: number;
  tax: number;
  total: number;
}

export function lineAmount(item: OfferItemLike): number {
  const hp = item.hp ?? 0;
  const amount = hp * item.unitRate;
  return Number.isFinite(amount) ? amount : 0;
}

export function computeOfferTotals(items: OfferItemLike[], taxPercent: number): OfferTotals {
  const subtotal = items.reduce((sum, item) => sum + lineAmount(item), 0);
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

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const ones = ONES[n % 10];
  return ones ? `${tens} ${ones}` : tens;
}

function threeDigits(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(" ");
}

/**
 * The offer document prints "Total Amount In Word", so amounts are spelled out on the Indian
 * scale — lakh and crore, not million — to match how the company already writes them.
 */
export function amountInWords(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "Zero Only";

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  const groups: Array<[number, string]> = [
    [Math.floor(rupees / 10000000), "Crore"],
    [Math.floor((rupees % 10000000) / 100000), "Lakh"],
    [Math.floor((rupees % 100000) / 1000), "Thousand"],
    [rupees % 1000, ""],
  ];

  const words = groups
    .filter(([value]) => value > 0)
    .map(([value, label]) => {
      const spelled = label === "" ? threeDigits(value) : twoDigits(value);
      return label ? `${spelled} ${label}` : spelled;
    })
    .join(" ");

  const rupeeWords = words || "Zero";
  return paise > 0
    ? `${rupeeWords} Rupees and ${twoDigits(paise)} Paise Only`
    : `${rupeeWords} Only`;
}

/**
 * Offer numbers follow the company's existing format, `AHM/AMC/<serial>/<year>` — for example
 * `AHM/AMC/007/2026`. The serial restarts each calendar year.
 */
export function offerNoPrefix(): string {
  return "AHM/AMC/";
}

export function offerNoSuffix(date: Date): string {
  return `/${date.getUTCFullYear()}`;
}

export function buildOfferNo(date: Date, serial: number): string {
  return `AHM/AMC/${String(serial).padStart(3, "0")}/${date.getUTCFullYear()}`;
}

/** Next serial given the highest existing offer number for the same year. */
export function nextOfferSerial(latestOfferNo: string | null): number {
  if (!latestOfferNo) return 1;
  const serial = Number(latestOfferNo.split("/")[2]);
  return Number.isFinite(serial) ? serial + 1 : 1;
}
