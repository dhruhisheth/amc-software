"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, SectionHeading, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/form";
import { COMPLAINT_PRIORITIES, COMPLAINT_STATUSES, type ComplaintInput } from "@/lib/complaints";
import { COMPLAINT_STATUS_LABELS, PRIORITY_LABELS } from "@/components/Badges";
import type { ComplaintPriority, ComplaintStatus } from "@/generated/prisma/enums";
import { assignTechnician, createComplaint, deleteComplaint, updateComplaint } from "./actions";

export interface ProjectOption {
  id: string;
  name: string;
}

export interface UnitOption {
  id: string;
  projectId: string;
  label: string;
}

export interface TechnicianOption {
  id: string;
  name: string;
}

export function ComplaintForm({
  mode,
  complaintId,
  initial,
  projects,
  units,
  technicians,
  readOnly = false,
}: {
  mode: "create" | "edit";
  complaintId?: string;
  initial: ComplaintInput;
  projects: ProjectOption[];
  units: UnitOption[];
  technicians: TechnicianOption[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ComplaintInput>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof ComplaintInput>(key: K, value: ComplaintInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  // Picking a project narrows the flat list; picking a flat with no project selected fills the
  // project in, so the two selects can be used in either order.
  const flatOptions = form.projectId ? units.filter((u) => u.projectId === form.projectId) : units;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        if (mode === "create") {
          const id = await createComplaint(form);
          router.push(`/complaints/${id}`);
        } else {
          await updateComplaint(complaintId!, form);
          setSaved(true);
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save complaint.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="space-y-5">
        <div>
          <SectionHeading>Complaint</SectionHeading>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Subject">
                <input
                  required
                  disabled={readOnly}
                  value={form.subject}
                  onChange={(e) => set("subject", e.target.value)}
                  className={inputClass}
                  placeholder="e.g. AC not cooling in bedroom"
                />
              </Field>
            </div>
            <Field label="Project">
              <select
                disabled={readOnly}
                value={form.projectId}
                onChange={(e) => {
                  const projectId = e.target.value;
                  setForm((f) => ({
                    ...f,
                    projectId,
                    // Drop a flat that no longer belongs to the chosen project.
                    unitId: units.find((u) => u.id === f.unitId)?.projectId === projectId ? f.unitId : "",
                  }));
                  setSaved(false);
                }}
                className={inputClass}
              >
                <option value="">— None —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Flat">
              <select
                disabled={readOnly}
                value={form.unitId}
                onChange={(e) => {
                  const unitId = e.target.value;
                  const unit = units.find((u) => u.id === unitId);
                  setForm((f) => ({
                    ...f,
                    unitId,
                    projectId: unit ? unit.projectId : f.projectId,
                  }));
                  setSaved(false);
                }}
                className={inputClass}
              >
                <option value="">— None —</option>
                {flatOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Complainant name">
              <input
                disabled={readOnly}
                value={form.complainantName}
                onChange={(e) => set("complainantName", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Contact number">
              <input
                disabled={readOnly}
                value={form.contactNumber}
                onChange={(e) => set("contactNumber", e.target.value)}
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea
                  disabled={readOnly}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </div>

        <div>
          <SectionHeading>Attending</SectionHeading>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Technician attending" hint="Who is handling this complaint.">
              <select
                disabled={readOnly}
                value={form.technicianId}
                onChange={(e) => set("technicianId", e.target.value)}
                className={inputClass}
              >
                <option value="">— Unassigned —</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                disabled={readOnly}
                value={form.priority}
                onChange={(e) => set("priority", e.target.value as ComplaintPriority)}
                className={inputClass}
              >
                {COMPLAINT_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                disabled={readOnly}
                value={form.status}
                onChange={(e) => set("status", e.target.value as ComplaintStatus)}
                className={inputClass}
              >
                {COMPLAINT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {COMPLAINT_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Attended on" hint="Filled in automatically when a technician is assigned.">
              <input
                type="date"
                disabled={readOnly}
                value={form.attendedAt}
                onChange={(e) => set("attendedAt", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Resolved on" hint="Filled in automatically when the status becomes Resolved.">
              <input
                type="date"
                disabled={readOnly}
                value={form.resolvedAt}
                onChange={(e) => set("resolvedAt", e.target.value)}
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-3">
              <Field label="Resolution notes">
                <textarea
                  disabled={readOnly}
                  value={form.resolutionNotes}
                  onChange={(e) => set("resolutionNotes", e.target.value)}
                  rows={2}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </div>
      </div>

      {readOnly ? (
        <p className="mt-4 text-sm text-slate-400">
          Your account has view-only access, so this complaint cannot be changed.
        </p>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={primaryButtonClass}>
            {pending ? "Saving..." : mode === "create" ? "Log complaint" : "Save changes"}
          </button>
          <button type="button" onClick={() => router.back()} className={secondaryButtonClass}>
            Cancel
          </button>
          {saved && <span className="text-sm text-green-600">Saved.</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      )}
    </form>
  );
}

/** The inline "who is attending this" picker on the complaints list. */
export function AssignTechnicianSelect({
  complaintId,
  technicianId,
  technicians,
  disabled,
}: {
  complaintId: string;
  technicianId: string | null;
  technicians: TechnicianOption[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(next: string) {
    setError(null);
    start(async () => {
      try {
        await assignTechnician(complaintId, next);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to assign.");
      }
    });
  }

  return (
    <>
      <select
        value={technicianId ?? ""}
        disabled={disabled || pending}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:border-transparent disabled:bg-transparent disabled:text-slate-600"
      >
        <option value="">— Unassigned —</option>
        {technicians.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </>
  );
}

export function DeleteComplaintButton({ complaintId }: { complaintId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    start(async () => {
      try {
        await deleteComplaint(complaintId);
      } catch (err) {
        // deleteComplaint redirects on success, which surfaces here as a control-flow throw.
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) return;
        setError(err instanceof Error ? err.message : "Failed to delete complaint.");
      }
    });
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className={secondaryButtonClass}>
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="text-red-700">Delete this complaint?</span>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "Deleting..." : "Yes, delete"}
      </button>
      <button onClick={() => setConfirming(false)} className={secondaryButtonClass}>
        Keep
      </button>
      {error && <span className="text-red-600">{error}</span>}
    </span>
  );
}
