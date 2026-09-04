export type ServiceBucket = "OVERDUE" | "DUE_SOON" | "OK" | "UNKNOWN";
export type RenewalBucket = "EXPIRED" | "EXPIRING_SOON" | "OK" | "UNKNOWN";

const DAY_MS = 1000 * 60 * 60 * 24;

export function computeServiceBucket(
  nextServiceDueDate: Date | null,
  now: Date = new Date(),
  dueSoonWindowDays = 14
): ServiceBucket {
  if (!nextServiceDueDate) return "UNKNOWN";
  const diffDays = (nextServiceDueDate.getTime() - now.getTime()) / DAY_MS;
  if (diffDays < 0) return "OVERDUE";
  if (diffDays <= dueSoonWindowDays) return "DUE_SOON";
  return "OK";
}

export function computeRenewalBucket(
  renewalDueDate: Date | null,
  now: Date = new Date(),
  leadDays = 30
): RenewalBucket {
  if (!renewalDueDate) return "UNKNOWN";
  const diffDays = (renewalDueDate.getTime() - now.getTime()) / DAY_MS;
  if (diffDays < 0) return "EXPIRED";
  if (diffDays <= leadDays) return "EXPIRING_SOON";
  return "OK";
}

// A renewed AMC period (newAmcPeriodEnd) supersedes the original once it exists — the later of
// the two dates reflects the currently-active contract end.
export function effectiveAmcEnd(unit: { amcPeriodEnd: Date | null; newAmcPeriodEnd: Date | null }): Date | null {
  const dates = [unit.amcPeriodEnd, unit.newAmcPeriodEnd].filter((d): d is Date => d !== null);
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

export interface RenewalDateSource {
  amcPeriodEnd: Date | null;
  newAmcPeriodEnd: Date | null;
  renewalDueDateOverride: Date | null;
}

/**
 * The renewal due date — deliberately a different thing from the service due date.
 *
 * Service due date  = when the next maintenance VISIT is owed (Unit.nextServiceDueDate, driven
 *                     by the last visit + the service interval).
 * Renewal due date  = when the CONTRACT itself must be renewed. It defaults to the end of the
 *                     effective AMC period, but can be set by hand per flat when the renewal
 *                     falls on a date the AMC period text doesn't imply.
 *
 * The two move independently: servicing a flat never changes its renewal date, and renewing a
 * contract never changes when the next visit is owed.
 */
export function resolveRenewalDueDate(unit: RenewalDateSource): Date | null {
  return unit.renewalDueDateOverride ?? effectiveAmcEnd(unit);
}

export const SERVICE_BUCKET_LABELS: Record<ServiceBucket, string> = {
  OVERDUE: "Overdue",
  DUE_SOON: "Due soon",
  OK: "OK",
  UNKNOWN: "Unknown",
};

export const RENEWAL_BUCKET_LABELS: Record<RenewalBucket, string> = {
  EXPIRED: "Expired",
  EXPIRING_SOON: "Expiring soon",
  OK: "OK",
  UNKNOWN: "Unknown",
};
