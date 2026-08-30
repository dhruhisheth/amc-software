"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUnit, markServiceDone, type UpdateUnitInput } from "./actions";

interface UnitFormData extends UpdateUnitInput {
  id: string;
}

export default function UnitEditForm({ unit }: { unit: UnitFormData }) {
  const router = useRouter();
  const [form, setForm] = useState<UpdateUnitInput>({
    siteName: unit.siteName,
    block: unit.block,
    contactInfo: unit.contactInfo,
    hp: unit.hp,
    through: unit.through,
    type: unit.type,
    billNo: unit.billNo,
    remarks: unit.remarks,
    status: unit.status,
  });
  const [saving, startSaving] = useTransition();
  const [markingDone, startMarkingDone] = useTransition();
  const [saved, setSaved] = useState(false);

  function set<K extends keyof UpdateUnitInput>(key: K, value: UpdateUnitInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    startSaving(async () => {
      await updateUnit(unit.id, form);
      setSaved(true);
      router.refresh();
    });
  }

  function handleMarkDone() {
    startMarkingDone(async () => {
      await markServiceDone(unit.id);
      setForm((f) => ({ ...f, status: "DONE" }));
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Site Name">
          <input
            value={form.siteName}
            onChange={(e) => set("siteName", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Block">
          <input value={form.block} onChange={(e) => set("block", e.target.value)} className="input" />
        </Field>
        <Field label="Contact Info">
          <input
            value={form.contactInfo}
            onChange={(e) => set("contactInfo", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="HP">
          <input value={form.hp} onChange={(e) => set("hp", e.target.value)} className="input" />
        </Field>
        <Field label="Through (vendor)">
          <input value={form.through} onChange={(e) => set("through", e.target.value)} className="input" />
        </Field>
        <Field label="Type">
          <input value={form.type} onChange={(e) => set("type", e.target.value)} className="input" />
        </Field>
        <Field label="Bill No">
          <input value={form.billNo} onChange={(e) => set("billNo", e.target.value)} className="input" />
        </Field>
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value as "DUE" | "DONE")}
            className="input"
          >
            <option value="DUE">DUE</option>
            <option value="DONE">DONE</option>
          </select>
        </Field>
      </div>
      <Field label="Remarks">
        <textarea
          value={form.remarks}
          onChange={(e) => set("remarks", e.target.value)}
          rows={3}
          className="input"
        />
      </Field>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
        <button
          onClick={handleMarkDone}
          disabled={markingDone}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {markingDone ? "Marking..." : "Mark service done today"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved.</span>}
      </div>

      <style jsx>{`
        :global(.input) {
          margin-top: 0.25rem;
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid rgb(203 213 225);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
