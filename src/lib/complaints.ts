import type { ComplaintPriority, ComplaintStatus } from "@/generated/prisma/enums";

/**
 * The complaint form's shape. It lives here rather than beside the server action because a
 * "use server" module can only export async functions, so EMPTY_COMPLAINT_INPUT could not.
 */
export interface ComplaintInput {
  projectId: string;
  unitId: string;
  complainantName: string;
  contactNumber: string;
  subject: string;
  description: string;
  priority: ComplaintPriority;
  /** The technician attending this complaint — the "name wise" assignment from the notes. */
  technicianId: string;
  status: ComplaintStatus;
  attendedAt: string;
  resolvedAt: string;
  resolutionNotes: string;
}

export const EMPTY_COMPLAINT_INPUT: ComplaintInput = {
  projectId: "",
  unitId: "",
  complainantName: "",
  contactNumber: "",
  subject: "",
  description: "",
  priority: "MEDIUM",
  technicianId: "",
  status: "OPEN",
  attendedAt: "",
  resolvedAt: "",
  resolutionNotes: "",
};

export const COMPLAINT_STATUSES: ComplaintStatus[] = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const COMPLAINT_PRIORITIES: ComplaintPriority[] = ["LOW", "MEDIUM", "HIGH"];

export const COMPLAINT_PRIORITY_LABELS: Record<ComplaintPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

/** A complaint still needing attention — what the dashboard and the tab badge count. */
export function isOpenComplaint(status: ComplaintStatus): boolean {
  return status === "OPEN" || status === "ASSIGNED" || status === "IN_PROGRESS";
}

/** Ticket numbers are `CMP-<YYYY>-<4-digit serial>`, serial scoped to the calendar year. */
export function ticketNoPrefix(date: Date): string {
  return `CMP-${date.getUTCFullYear()}-`;
}

export function buildTicketNo(date: Date, serial: number): string {
  return `${ticketNoPrefix(date)}${String(serial).padStart(4, "0")}`;
}

export function nextTicketSerial(latestTicketNo: string | null): number {
  if (!latestTicketNo) return 1;
  const serial = Number(latestTicketNo.split("-").pop());
  return Number.isFinite(serial) ? serial + 1 : 1;
}
