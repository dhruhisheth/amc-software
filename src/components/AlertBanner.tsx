import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { formatCalendarDate } from "@/lib/date";
import { computeAlerts, type AlertItem } from "@/lib/alerts";

/**
 * The standing alert for anything falling due, shown on every page while signed in.
 *
 * This is the whole reminder mechanism: it is computed when a page is opened, so it needs no
 * scheduler, no email or SMS provider, and no stored state that could drift.
 */
export default async function AlertBanner() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const alerts = await computeAlerts();
  if (alerts.total === 0) return null;

  // A handful is enough to act on; the rest are a click away under Service History.
  const preview = [...alerts.serviceDue, ...alerts.renewalDue]
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 4);

  const tone = alerts.overdueCount > 0 ? "alert-banner danger" : "alert-banner";

  return (
    <div className={tone} role="status">
      <div className="alert-banner-head">
        <strong>
          {alerts.serviceDue.length > 0 && (
            <>
              {alerts.serviceDue.length} service{alerts.serviceDue.length === 1 ? "" : "s"} due
            </>
          )}
          {alerts.serviceDue.length > 0 && alerts.renewalDue.length > 0 && " · "}
          {alerts.renewalDue.length > 0 && (
            <>
              {alerts.renewalDue.length} renewal{alerts.renewalDue.length === 1 ? "" : "s"} due
            </>
          )}
        </strong>
        <span className="alert-banner-sub">
          within {alerts.leadDays} days
          {alerts.overdueCount > 0 && ` · ${alerts.overdueCount} already past due`}
        </span>
        <Link href="/history" className="alert-banner-link">
          See all &rarr;
        </Link>
      </div>

      <ul className="alert-banner-list">
        {preview.map((item) => (
          <li key={`${item.unitId}-${item.dueDate.toISOString()}`}>
            <Link href={`/projects/${item.projectId}/units/${item.unitId}`}>
              {item.label} — {item.projectName}
            </Link>
            <span className={item.overdue ? "alert-when overdue" : "alert-when"}>
              {describeWhen(item)}
            </span>
          </li>
        ))}
        {alerts.total > preview.length && (
          <li className="alert-banner-more">and {alerts.total - preview.length} more</li>
        )}
      </ul>
    </div>
  );
}

function describeWhen(item: AlertItem): string {
  const date = formatCalendarDate(item.dueDate) ?? "";
  if (item.daysUntil === 0) return `due today (${date})`;
  if (item.daysUntil < 0) return `${Math.abs(item.daysUntil)} days overdue (${date})`;
  return `in ${item.daysUntil} days (${date})`;
}
