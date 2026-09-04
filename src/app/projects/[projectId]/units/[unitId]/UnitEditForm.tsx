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
    <div className="card">
      <UnitFields value={form} onChange={handleChange} disabled={readOnly} />

      {readOnly ? (
        <p className="hint">
          Your account has view-only access, so these fields cannot be changed.
        </p>
      ) : (
        <div className="form-actions">
          <button
            onClick={handleSave}
            disabled={saving}
            className="primary"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          {saved && <span className="success-text">Saved.</span>}
          {error && <span className="error-text">{error}</span>}
        </div>
      )}
    </div>
  );
}
