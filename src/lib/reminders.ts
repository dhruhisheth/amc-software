import { prisma } from "@/lib/prisma";
import { addCalendarDays, formatCalendarDate, todayUtcMidnight } from "@/lib/date";
import { resolveRenewalDueDate } from "@/lib/status";
import { unitLabel } from "@/lib/units";
import { deliver } from "@/lib/notify";
import { Prisma } from "@/generated/prisma/client";

/** How far back a missed service or renewal still raises a reminder. */
export const REMINDER_GRACE_DAYS = 30;

export interface ReminderRunResult {
  raised: number;
  sent: number;
  skipped: number;
  failed: number;
  messages: string[];
}

/**
 * Raise reminder rows for everything falling due inside the lead time.
 *
 * Two kinds: a scheduled service coming up (one of the four quarterly visits), and a contract
 * coming up for renewal. The unique key on (unitId, kind, dueDate) means running this repeatedly
 * — as a daily cron does — never raises the same reminder twice.
 */
export async function raiseDueReminders(now: Date = todayUtcMidnight()): Promise<number> {
  const appSettings = await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  const horizon = addCalendarDays(now, appSettings.reminderLeadDays);
  // Reminders also have a floor. Without one, every contract that lapsed years ago raises a
  // renewal reminder the first time this runs — on the existing data that was 80 of them at
  // once, which would bury the handful that actually need acting on. Recently-missed items are
  // still worth chasing, so the floor is a grace window rather than today.
  const floor = addCalendarDays(now, -REMINDER_GRACE_DAYS);

  const [dueVisits, units] = await Promise.all([
    prisma.serviceVisit.findMany({
      where: { status: "PENDING", scheduledDate: { not: null, lte: horizon, gte: floor } },
      select: { unitId: true, scheduledDate: true },
    }),
    prisma.unit.findMany({
      select: {
        id: true,
        amcPeriodEnd: true,
        newAmcPeriodEnd: true,
        renewalDueDateOverride: true,
      },
    }),
  ]);

  const rows: Prisma.ReminderCreateManyInput[] = [];

  for (const visit of dueVisits) {
    rows.push({
      unitId: visit.unitId,
      kind: "SERVICE_DUE",
      dueDate: visit.scheduledDate as Date,
    });
  }

  for (const unit of units) {
    const renewalDue = resolveRenewalDueDate(unit);
    if (
      renewalDue &&
      renewalDue.getTime() <= horizon.getTime() &&
      renewalDue.getTime() >= floor.getTime()
    ) {
      rows.push({ unitId: unit.id, kind: "RENEWAL_DUE", dueDate: renewalDue });
    }
  }

  if (rows.length === 0) return 0;

  // skipDuplicates leans on the unique key so re-runs are cheap and idempotent.
  const created = await prisma.reminder.createMany({ data: rows, skipDuplicates: true });
  return created.count;
}

function messageFor(
  kind: "SERVICE_DUE" | "RENEWAL_DUE",
  unit: { flatNo: string | null; block: string | null; siteName: string | null; project: { name: string } },
  dueDate: Date
): { subject: string; body: string } {
  const where = `${unitLabel(unit)}, ${unit.project.name}`;
  const when = formatCalendarDate(dueDate, "DD.MM.YYYY") ?? "";

  if (kind === "SERVICE_DUE") {
    return {
      subject: `AMC service due ${when} — ${where}`,
      body: `Service due on ${when} for ${where}. (One of the four services in the AMC year.)`,
    };
  }
  return {
    subject: `AMC renewal due ${when} — ${where}`,
    body: `The AMC contract for ${where} is due for renewal on ${when}.`,
  };
}

/** Deliver every reminder still waiting to go out. */
export async function sendPendingReminders(): Promise<ReminderRunResult> {
  const appSettings = await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const pending = await prisma.reminder.findMany({
    where: { status: "PENDING" },
    orderBy: { dueDate: "asc" },
    include: { unit: { include: { project: { select: { name: true } } } } },
  });

  const result: ReminderRunResult = { raised: 0, sent: 0, skipped: 0, failed: 0, messages: [] };

  for (const reminder of pending) {
    const { subject, body } = messageFor(reminder.kind, reminder.unit, reminder.dueDate);
    const outcome = await deliver(
      { email: appSettings.reminderEmail, phone: appSettings.reminderPhone },
      subject,
      body
    );

    if (outcome.ok) {
      result.sent++;
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: "SENT", sentAt: new Date(), channel: outcome.channels.join(", "), error: null },
      });
      continue;
    }

    // Nothing configured is a different thing from a provider rejecting the message: the first
    // is the expected state before keys are added, and must not read as a failure.
    const unconfigured = outcome.errors.every((e) => e.includes("not configured") || e.includes("No reminder"));
    result[unconfigured ? "skipped" : "failed"]++;
    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { status: unconfigured ? "SKIPPED" : "FAILED", error: outcome.errors.join("; ") },
    });
    if (outcome.errors.length > 0) result.messages.push(outcome.errors[0]);
  }

  return result;
}

/** Raise anything newly due, then try to deliver everything outstanding. */
export async function runReminders(): Promise<ReminderRunResult> {
  const raised = await raiseDueReminders();
  const result = await sendPendingReminders();
  return { ...result, raised };
}
