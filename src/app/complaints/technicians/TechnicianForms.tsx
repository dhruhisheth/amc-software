"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/form";
import { createTechnician, deleteTechnician, updateTechnician, type TechnicianInput } from "../actions";

const EMPTY: TechnicianInput = { name: "", phone: "", skills: "", active: true };

function TechnicianFields({
  value,
  onChange,
}: {
  value: TechnicianInput;
  onChange: (next: TechnicianInput) => void;
}) {
  return (
    <div className="form-grid cols-4">
      <Field label="Name">
        <input
          required
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
         
          placeholder="Technician's name"
        />
      </Field>
      <Field label="Phone">
        <input
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
         
        />
      </Field>
      <Field label="Skills / notes">
        <input
          value={value.skills}
          onChange={(e) => onChange({ ...value, skills: e.target.value })}
         
          placeholder="e.g. VRF, chillers"
        />
      </Field>
      <Field label="Available for assignment">
        <select
          value={value.active ? "yes" : "no"}
          onChange={(e) => onChange({ ...value, active: e.target.value === "yes" })}
         
        >
          <option value="yes">Active</option>
          <option value="no">Inactive</option>
        </select>
      </Field>
    </div>
  );
}

export function AddTechnicianForm() {
  const router = useRouter();
  const [form, setForm] = useState<TechnicianInput>(EMPTY);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        await createTechnician(form);
        setForm(EMPTY);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add technician.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2>Add a technician</h2>
      <div>
        <TechnicianFields value={form} onChange={setForm} />
      </div>
      <div className="form-actions">
        <button type="submit" disabled={pending} className="primary">
          {pending ? "Adding..." : "Add technician"}
        </button>
        {error && <span className="error-text">{error}</span>}
      </div>
    </form>
  );
}

export function TechnicianRow({
  technicianId,
  initial,
  complaintCount,
  visitCount,
  editable,
  deletable,
}: {
  technicianId: string;
  initial: TechnicianInput;
  complaintCount: number;
  visitCount: number;
  editable: boolean;
  deletable: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<TechnicianInput>(initial);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    start(async () => {
      try {
        await updateTechnician(technicianId, form);
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  function handleDelete() {
    setError(null);
    start(async () => {
      try {
        await deleteTechnician(technicianId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove technician.");
      }
    });
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={5}>
          <TechnicianFields value={form} onChange={setForm} />
          <div className="form-actions">
            <button onClick={handleSave} disabled={pending} className="primary">
              {pending ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setForm(initial);
                setEditing(false);
                setError(null);
              }}
             
            >
              Cancel
            </button>
            {error && <span className="error-text">{error}</span>}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="cell-strong">
        {initial.name}
        {!initial.active && <span className="cell-sub">(inactive)</span>}
      </td>
      <td className="muted">{initial.phone || "—"}</td>
      <td className="muted">{initial.skills || "—"}</td>
      <td className="muted">
        {complaintCount} complaints · {visitCount} services
      </td>
      <td className="numeric">
        <div className="form-actions">
          {editable && (
            <button onClick={() => setEditing(true)} className="back-link">
              Edit
            </button>
          )}
          {deletable && complaintCount === 0 && visitCount === 0 && (
            <button onClick={handleDelete} disabled={pending} className="link-button danger-text">
              {pending ? "Removing..." : "Remove"}
            </button>
          )}
          {error && <span className="error-text">{error}</span>}
        </div>
      </td>
    </tr>
  );
}
