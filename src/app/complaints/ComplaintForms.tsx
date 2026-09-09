"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, SectionHeading } from "@/components/form";
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
    <form onSubmit={handleSubmit} className="card">
      <div className="page">
        <div>
          <SectionHeading>Complaint</SectionHeading>
          <div className="form-grid cols-2">
            <div className="span-all">
              <Field label="Subject">
                <input
                  required
                  disabled={readOnly}
                  value={form.subject}
                  onChange={(e) => set("subject", e.target.value)}
                 
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
               
              />
            </Field>
            <Field label="Contact number">
              <input
                disabled={readOnly}
                value={form.contactNumber}
                onChange={(e) => set("contactNumber", e.target.value)}
               
              />
            </Field>
            <div className="span-all">
              <Field label="Description">
                <textarea
                  disabled={readOnly}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                 
                />
              </Field>
            </div>
          </div>
        </div>

        <div>
          <SectionHeading>Attending</SectionHeading>
          <div className="form-grid cols-3">
            <Field label="Technician attending (1)" hint="Two technicians attend every complaint.">
              <select
                disabled={readOnly}
                value={form.technicianId}
                onChange={(e) => set("technicianId", e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {technicians
                  .filter((t) => t.id !== form.technician2Id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Technician attending (2)" hint="The second technician on the job.">
              <select
                disabled={readOnly}
                value={form.technician2Id}
                onChange={(e) => set("technician2Id", e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {technicians
                  .filter((t) => t.id !== form.technicianId)
                  .map((t) => (
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
               
              />
            </Field>
            <Field label="Resolved on" hint="Filled in automatically when the status becomes Resolved.">
              <input
                type="date"
                disabled={readOnly}
                value={form.resolvedAt}
                onChange={(e) => set("resolvedAt", e.target.value)}
               
              />
            </Field>
            <div className="span-all">
              <Field label="Resolution notes">
                <textarea
                  disabled={readOnly}
                  value={form.resolutionNotes}
                  onChange={(e) => set("resolutionNotes", e.target.value)}
                  rows={2}
                 
                />
              </Field>
            </div>
          </div>
        </div>
      </div>

      {readOnly ? (
        <p className="hint">
          Your account has view-only access, so this complaint cannot be changed.
        </p>
      ) : (
        <div className="form-actions">
          <button type="submit" disabled={pending} className="primary">
            {pending ? "Saving..." : mode === "create" ? "Log complaint" : "Save changes"}
          </button>
          <button type="button" onClick={() => router.back()}>
            Cancel
          </button>
          {saved && <span className="success-text">Saved.</span>}
          {error && <span className="error-text">{error}</span>}
        </div>
      )}
    </form>
  );
}

/** The inline "who is attending this" picker on the complaints list. */
export function AssignTechnicianSelect({
  complaintId,
  technicianId,
  technician2Id,
  technicians,
  disabled,
}: {
  complaintId: string;
  technicianId: string | null;
  technician2Id: string | null;
  technicians: TechnicianOption[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(next: string, slot: 1 | 2) {
    setError(null);
    start(async () => {
      try {
        await assignTechnician(complaintId, next, slot);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to assign.");
      }
    });
  }

  // Two technicians attend, so the list offers both slots. Each select hides whoever is already
  // in the other slot, so the same person cannot be picked twice.
  return (
    <div className="assign-slots">
      {([1, 2] as const).map((slot) => {
        const current = slot === 1 ? technicianId : technician2Id;
        const other = slot === 1 ? technician2Id : technicianId;
        return (
          <select
            key={slot}
            value={current ?? ""}
            disabled={disabled || pending}
            onChange={(e) => handleChange(e.target.value, slot)}
            aria-label={slot === 1 ? "Lead technician" : "Second technician"}
          >
            <option value="">{slot === 1 ? "— Unassigned —" : "— No second —"}</option>
            {technicians
              .filter((t) => t.id !== other)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        );
      })}
      {error && <div className="error-text">{error}</div>}
    </div>
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
      <button onClick={() => setConfirming(true)}>
        Delete
      </button>
    );
  }

  return (
    <span className="form-actions">
      <span className="error-text">Delete this complaint?</span>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="danger-solid"
      >
        {pending ? "Deleting..." : "Yes, delete"}
      </button>
      <button onClick={() => setConfirming(false)}>
        Keep
      </button>
      {error && <span className="error-text">{error}</span>}
    </span>
  );
}
