"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUnit } from "@/app/projects/actions";
import { EMPTY_UNIT_INPUT, type UnitInput } from "@/lib/units";
import { UnitFields } from "@/components/UnitFields";

export default function AddUnitPanel({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<UnitInput>(EMPTY_UNIT_INPUT);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        await createUnit(projectId, form);
        setForm(EMPTY_UNIT_INPUT);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add flat.");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="primary"
      >
        Add flat
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2>Add a flat</h2>
      <div>
        <UnitFields value={form} onChange={setForm} />
      </div>
      <div className="form-actions">
        <button
          type="submit"
          disabled={pending}
          className="primary"
        >
          {pending ? "Adding..." : "Add flat"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
         
        >
          Cancel
        </button>
        {error && <span className="error-text">{error}</span>}
      </div>
    </form>
  );
}
