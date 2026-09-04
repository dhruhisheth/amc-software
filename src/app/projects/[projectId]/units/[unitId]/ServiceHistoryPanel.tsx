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

const inputClass = "rounded-md border border-slate-300 px-2 py-1.5 text-sm";

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
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Service history</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            <span className="font-medium text-green-700">{doneCount} done</span>
            {" · "}
            <span className="font-medium text-amber-700">{pendingCount} pending</span>
          </p>
        </div>
        {canEditVisits && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(mode === "done" ? null : "done")}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Record service done
            </button>
            <button
              onClick={() => setMode(mode === "schedule" ? null : "schedule")}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Schedule a visit
            </button>
          </div>
        )}
      </div>

      {mode && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3 rounded-md bg-slate-50 p-3">
          <label className="text-sm">
            <span className="block font-medium text-slate-700">
              {mode === "done" ? "Service date" : "Scheduled for"}
            </span>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`mt-1 block ${inputClass}`}
            />
          </label>
          <label className="text-sm">
            <span className="block font-medium text-slate-700">Technician</span>
            <select
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              className={`mt-1 block ${inputClass}`}
            >
              <option value="">— unassigned —</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 text-sm">
            <span className="block font-medium text-slate-700">Notes</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`mt-1 block w-full ${inputClass}`}
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {pending ? "Saving..." : mode === "done" ? "Record" : "Schedule"}
          </button>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {visits.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">No recorded or scheduled visits.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-slate-400">
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
                <tr key={v.id} className="border-t border-slate-100">
                  <td className="py-1.5 pr-4 text-slate-500">{v.sequence}</td>
                  <td className="py-1.5 pr-4">
                    <VisitStatusBadge status={v.status} />
                  </td>
                  <td className="py-1.5 pr-4">
                    {v.status === "DONE"
                      ? v.visitDate ?? <span className="text-slate-400">{v.rawText ?? "unparsed"}</span>
                      : v.scheduledDate ?? "—"}
                  </td>
                  <td className="py-1.5 pr-4 text-slate-600">{v.technicianName ?? "—"}</td>
                  <td className="py-1.5 pr-4 text-slate-500">{v.notes ?? "—"}</td>
                  <td className="py-1.5 text-right">
                    <div className="flex items-center justify-end gap-2">
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
                          className="text-xs text-slate-500 underline hover:text-slate-900 disabled:opacity-50"
                        >
                          Mark done
                        </button>
                      )}
                      {canDeleteVisits && (
                        <button
                          onClick={() => run(() => deleteVisit(unitId, v.id))}
                          disabled={pending}
                          className="text-xs text-red-600 underline hover:text-red-800 disabled:opacity-50"
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
