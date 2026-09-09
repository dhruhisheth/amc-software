import { prisma } from "@/lib/prisma";
import { addCalendarDays, todayUtcMidnight } from "@/lib/date";
import { resolveRenewalDueDate } from "@/lib/status";
import { unitLabel } from "@/lib/units";

/**
 * What needs attention right now, computed live whenever a page is opened.
 *
 * Deliberately derived on read rather than stored: there is nothing to schedule, nothing to keep
 * in step, and no way for the alert to disagree with the data behind it.
 */

/**
 * How far back a missed service or renewal keeps alerting.
 *
 * Without a floor, every contract that lapsed years ago alerts forever — on the current data
 * that was 80 items at once, which buries the handful that actually need acting on. A month is
 * long enough that something genuinely missed still shows up.
 */
export const ALERT_GRACE_DAYS = 30;

export interface AlertItem {
  unitId: string;
  projectId: string;
  label: string;
  projectName: string;
  dueDate: Date;
  /** Negative once the date has passed. */
  daysUntil: number;
  overdue: boolean;
}

export interface AlertSummary {
  serviceDue: AlertItem[];
  renewalDue: AlertItem[];
  total: number;
  overdueCount: number;
  leadDays: number;
}

const DAY_MS = 1000 * 60 * 60 * 24;

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

export async function computeAlerts(now: Date = todayUtcMidnight()): Promise<AlertSummary> {
  const appSettings = await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const horizon = addCalendarDays(now, appSettings.reminderLeadDays);
  const floor = addCalendarDays(now, -ALERT_GRACE_DAYS);

  const [dueVisits, units] = await Promise.all([
    prisma.serviceVisit.findMany({
      where: { status: "PENDING", scheduledDate: { not: null, lte: horizon, gte: floor } },
      select: {
        scheduledDate: true,
        unit: {
          select: {
            id: true,
            projectId: true,
            block: true,
            flatNo: true,
            siteName: true,
            project: { select: { name: true } },
          },
        },
      },
    }),
    prisma.unit.findMany({
      select: {
        id: true,
        projectId: true,
        block: true,
        flatNo: true,
        siteName: true,
        amcPeriodEnd: true,
        newAmcPeriodEnd: true,
        renewalDueDateOverride: true,
        project: { select: { name: true } },
      },
    }),
  ]);

  const serviceDue: AlertItem[] = dueVisits.map((visit) => {
    const dueDate = visit.scheduledDate as Date;
    return {
      unitId: visit.unit.id,
      projectId: visit.unit.projectId,
      label: unitLabel(visit.unit),
      projectName: visit.unit.project.name,
      dueDate,
      daysUntil: daysBetween(now, dueDate),
      overdue: dueDate.getTime() < now.getTime(),
    };
  });

  const renewalDue: AlertItem[] = [];
  for (const unit of units) {
    const dueDate = resolveRenewalDueDate(unit);
    if (!dueDate) continue;
    if (dueDate.getTime() > horizon.getTime() || dueDate.getTime() < floor.getTime()) continue;

    renewalDue.push({
      unitId: unit.id,
      projectId: unit.projectId,
      label: unitLabel(unit),
      projectName: unit.project.name,
      dueDate,
      daysUntil: daysBetween(now, dueDate),
      overdue: dueDate.getTime() < now.getTime(),
    });
  }

  const byDate = (a: AlertItem, b: AlertItem) => a.dueDate.getTime() - b.dueDate.getTime();
  serviceDue.sort(byDate);
  renewalDue.sort(byDate);

  return {
    serviceDue,
    renewalDue,
    total: serviceDue.length + renewalDue.length,
    overdueCount: [...serviceDue, ...renewalDue].filter((i) => i.overdue).length,
    leadDays: appSettings.reminderLeadDays,
  };
}
