"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UnitFields } from "@/components/UnitFields";
import type { UnitInput } from "@/lib/units";
import { updateUnit } from "./actions";

export default function UnitEditForm({
  unitId,
  initial,
  readOnly,
}: {
  unitId: string;
  initial: UnitInput;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<UnitInput>(initial);
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(next: UnitInput) {
    setForm(next);
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startSaving(async () => {
      try {
        await updateUnit(unitId, form);
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <UnitFields value={form} onChange={handleChange} disabled={readOnly} />

      {readOnly ? (
        <p className="mt-4 text-sm text-slate-400">
          Your account has view-only access, so these fields cannot be changed.
        </p>
      ) : (
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          {saved && <span className="text-sm text-green-600">Saved.</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      )}
    </div>
  );
}
