"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { VisitStatusBadge } from "@/components/Badges";
import { completeVisit, scheduleVisit, deleteVisit } from "./actions";

export interface VisitRow {
  id: string;
  sequence: number;
  status: "DONE" | "PENDING";
  visitDate: string | null;
  scheduledDate: string | null;
  technicianId: string | null;
  technicianName: string | null;
  notes: string | null;
  rawText: string | null;
}

export interface TechnicianOption {
  id: string;
  name: string;
}

export default function ServiceHistoryPanel({
  unitId,
  visits,
  technicians,
  canEditVisits,
  canDeleteVisits,
  today,
}: {
  unitId: string;
  visits: VisitRow[];
  technicians: TechnicianOption[];
  canEditVisits: boolean;
  canDeleteVisits: boolean;
  today: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"done" | "schedule" | null>(null);
  const [date, setDate] = useState(today);
  const [technicianId, setTechnicianId] = useState("");
  const [notes, setNotes] = useState("");

  const doneCount = visits.filter((v) => v.status === "DONE").length;
  const pendingCount = visits.filter((v) => v.status === "PENDING").length;

  function run(fn: () => Promise<void>) {
    setError(null);
    start(async () => {
      try {
        await fn();
        setMode(null);
        setDate(today);
        setTechnicianId("");
        setNotes("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "done") {
      run(() => completeVisit(unitId, { visitDate: date, technicianId, notes }));
    } else if (mode === "schedule") {
      run(() => scheduleVisit(unitId, { scheduledDate: date, technicianId, notes }));
    }
  }

  return (
    <div className="card">
      <div className="page-header">
        <div>
          <h2>Service history</h2>
          <p className="muted">
            <span className="success-text">{doneCount} done</span>
            {" · "}
            <span className="cell-pending">{pendingCount} pending</span>
          </p>
        </div>
        {canEditVisits && (
          <div className="form-actions">
            <button
              onClick={() => setMode(mode === "done" ? null : "done")}
              className="primary"
            >
              Record service done
            </button>
            <button
              onClick={() => setMode(mode === "schedule" ? null : "schedule")}
             
            >
              Schedule a visit
            </button>
          </div>
        )}
      </div>

      {mode && (
        <form onSubmit={handleSubmit} className="filters card">
          <label className="field">
            <span className="field-label">
              {mode === "done" ? "Service date" : "Scheduled for"}
            </span>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
             
            />
          </label>
          <label className="field">
            <span className="field-label">Technician</span>
            <select
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
             
            >
              <option value="">— unassigned —</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Notes</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
             
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="primary"
          >
            {pending ? "Saving..." : mode === "done" ? "Record" : "Schedule"}
          </button>
        </form>
      )}

      {error && <p className="error-text">{error}</p>}

      {visits.length === 0 ? (
        <p className="hint">No recorded or scheduled visits.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr className="muted">
                <th className="pb-1 pr-4">#</th>
                <th className="pb-1 pr-4">Status</th>
                <th className="pb-1 pr-4">Date</th>
                <th className="pb-1 pr-4">Technician</th>
                <th className="pb-1 pr-4">Notes</th>
                <th className="pb-1"></th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id}>
                  <td className="muted">{v.sequence}</td>
                  <td>
                    <VisitStatusBadge status={v.status} />
                  </td>
                  <td>
                    {v.status === "DONE"
                      ? v.visitDate ?? <span className="muted">{v.rawText ?? "unparsed"}</span>
                      : v.scheduledDate ?? "—"}
                  </td>
                  <td>{v.technicianName ?? "—"}</td>
                  <td className="muted">{v.notes ?? "—"}</td>
                  <td className="numeric">
                    <div className="form-actions">
                      {canEditVisits && v.status === "PENDING" && (
                        <button
                          onClick={() =>
                            run(() =>
                              completeVisit(
                                unitId,
                                {
                                  visitDate: v.scheduledDate ?? today,
                                  technicianId: v.technicianId ?? "",
                                  notes: v.notes ?? "",
                                },
                                v.id
                              )
                            )
                          }
                          disabled={pending}
                          className="link-button"
                        >
                          Mark done
                        </button>
                      )}
                      {canDeleteVisits && (
                        <button
                          onClick={() => run(() => deleteVisit(unitId, v.id))}
                          disabled={pending}
                          className="link-button danger-text"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
