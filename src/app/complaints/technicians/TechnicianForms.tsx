"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/form";
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
      <Field label="Name">
        <input
          required
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className={inputClass}
          placeholder="Technician's name"
        />
      </Field>
      <Field label="Phone">
        <input
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="Skills / notes">
        <input
          value={value.skills}
          onChange={(e) => onChange({ ...value, skills: e.target.value })}
          className={inputClass}
          placeholder="e.g. VRF, chillers"
        />
      </Field>
      <Field label="Available for assignment">
        <select
          value={value.active ? "yes" : "no"}
          onChange={(e) => onChange({ ...value, active: e.target.value === "yes" })}
          className={inputClass}
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
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-900">Add a technician</h2>
      <div className="mt-3">
        <TechnicianFields value={form} onChange={setForm} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Adding..." : "Add technician"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
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
      <tr className="border-t border-slate-100">
        <td colSpan={5} className="px-3 py-3">
          <TechnicianFields value={form} onChange={setForm} />
          <div className="mt-3 flex items-center gap-3">
            <button onClick={handleSave} disabled={pending} className={primaryButtonClass}>
              {pending ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setForm(initial);
                setEditing(false);
                setError(null);
              }}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="px-3 py-2 font-medium text-slate-900">
        {initial.name}
        {!initial.active && <span className="ml-2 text-xs text-slate-400">(inactive)</span>}
      </td>
      <td className="px-3 py-2 text-slate-500">{initial.phone || "—"}</td>
      <td className="px-3 py-2 text-slate-500">{initial.skills || "—"}</td>
      <td className="px-3 py-2 text-slate-500">
        {complaintCount} complaints · {visitCount} services
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex flex-wrap items-center justify-end gap-3">
          {editable && (
            <button onClick={() => setEditing(true)} className="text-sm text-slate-500 underline hover:text-slate-900">
              Edit
            </button>
          )}
          {deletable && complaintCount === 0 && visitCount === 0 && (
            <button onClick={handleDelete} disabled={pending} className="text-sm text-red-600 hover:underline">
              {pending ? "Removing..." : "Remove"}
            </button>
          )}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </td>
    </tr>
  );
}
