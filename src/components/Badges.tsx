import type {
  ComplaintPriority,
  ComplaintStatus,
  OfferStatus,
  UnitStatus,
  VisitStatus,
} from "@/generated/prisma/enums";
import type { RenewalBucket, ServiceBucket } from "@/lib/status";
import { RENEWAL_BUCKET_LABELS, SERVICE_BUCKET_LABELS } from "@/lib/status";

type Tone = "neutral" | "danger" | "warning" | "success" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  danger: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  success: "bg-green-100 text-green-700",
  info: "bg-blue-100 text-blue-700",
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}

export function ServiceBadge({ bucket }: { bucket: ServiceBucket }) {
  const tone: Tone =
    bucket === "OVERDUE" ? "danger" : bucket === "DUE_SOON" ? "warning" : bucket === "OK" ? "success" : "neutral";
  return <Badge tone={tone}>{SERVICE_BUCKET_LABELS[bucket]}</Badge>;
}

export function RenewalBadge({ bucket }: { bucket: RenewalBucket }) {
  const tone: Tone =
    bucket === "EXPIRED" ? "danger" : bucket === "EXPIRING_SOON" ? "warning" : bucket === "OK" ? "success" : "neutral";
  return <Badge tone={tone}>{RENEWAL_BUCKET_LABELS[bucket]}</Badge>;
}

export function UnitStatusBadge({ status, manualOverride }: { status: UnitStatus; manualOverride?: boolean }) {
  return (
    <Badge tone={status === "DONE" ? "success" : "neutral"}>
      {status}
      {manualOverride && <span title="Manually set">*</span>}
    </Badge>
  );
}

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export function ComplaintStatusBadge({ status }: { status: ComplaintStatus }) {
  const tone: Tone =
    status === "OPEN" ? "danger" : status === "ASSIGNED" || status === "IN_PROGRESS" ? "warning" : "success";
  return <Badge tone={tone}>{COMPLAINT_STATUS_LABELS[status]}</Badge>;
}

export const PRIORITY_LABELS: Record<ComplaintPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export function PriorityBadge({ priority }: { priority: ComplaintPriority }) {
  const tone: Tone = priority === "HIGH" ? "danger" : priority === "MEDIUM" ? "warning" : "neutral";
  return <Badge tone={tone}>{PRIORITY_LABELS[priority]}</Badge>;
}

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const tone: Tone =
    status === "ACCEPTED" ? "success" : status === "REJECTED" || status === "EXPIRED" ? "danger" : status === "SENT" ? "info" : "neutral";
  return <Badge tone={tone}>{OFFER_STATUS_LABELS[status]}</Badge>;
}

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  DONE: "Done",
  PENDING: "Pending",
};

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  return <Badge tone={status === "DONE" ? "success" : "warning"}>{VISIT_STATUS_LABELS[status]}</Badge>;
}
