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
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Add flat
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 w-full rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-900">Add a flat</h2>
      <div className="mt-4">
        <UnitFields value={form} onChange={setForm} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "Adding..." : "Add flat"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
