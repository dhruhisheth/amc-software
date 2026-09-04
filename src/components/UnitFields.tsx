"use client";

import type { UnitInput } from "@/lib/units";
import { Field, SectionHeading, inputClass } from "@/components/form";

/**
 * The one flat/unit field set, shared by "Add flat" on a project and the flat's own edit page,
 * so a flat added by hand and a flat edited later always expose exactly the same fields.
 *
 * Note there is deliberately no Contact No. field — contact numbers were dropped from the app.
 */
export function UnitFields({
  value,
  onChange,
  disabled = false,
}: {
  value: UnitInput;
  onChange: (next: UnitInput) => void;
  disabled?: boolean;
}) {
  function set<K extends keyof UnitInput>(key: K, v: UnitInput[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="space-y-5">
      <div>
        <SectionHeading>Location</SectionHeading>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Block No">
            <input
              disabled={disabled}
              value={value.block}
              onChange={(e) => set("block", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Flat No">
            <input
              disabled={disabled}
              value={value.flatNo}
              onChange={(e) => set("flatNo", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Site / Owner name">
            <input
              disabled={disabled}
              value={value.siteName}
              onChange={(e) => set("siteName", e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="sm:col-span-3">
            <Field label="Address">
              <input
                disabled={disabled}
                value={value.address}
                onChange={(e) => set("address", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      </div>

      <div>
        <SectionHeading>Equipment</SectionHeading>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="HP">
            <input
              disabled={disabled}
              value={value.hp}
              onChange={(e) => set("hp", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Type">
            <input
              disabled={disabled}
              value={value.type}
              onChange={(e) => set("type", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Through (vendor)">
            <input
              disabled={disabled}
              value={value.through}
              onChange={(e) => set("through", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Bill No">
            <input
              disabled={disabled}
              value={value.billNo}
              onChange={(e) => set("billNo", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      <div>
        <SectionHeading>Service dates &amp; renewal</SectionHeading>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Last service date">
            <input
              type="date"
              disabled={disabled}
              value={value.lastServiceDate}
              onChange={(e) => set("lastServiceDate", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label="Service due date"
            hint="When the next visit is owed. Left blank, it is derived from the last service date + the service interval."
          >
            <input
              type="date"
              disabled={disabled}
              value={value.nextServiceDueDate}
              onChange={(e) => set("nextServiceDueDate", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label="Renewal due date"
            hint="When the contract itself must be renewed — separate from the service due date. Blank falls back to the AMC period end."
          >
            <input
              type="date"
              disabled={disabled}
              value={value.renewalDueDate}
              onChange={(e) => set("renewalDueDate", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="AMC period">
            <input
              disabled={disabled}
              value={value.amcPeriodText}
              onChange={(e) => set("amcPeriodText", e.target.value)}
              className={inputClass}
              placeholder="e.g. 01.04.2025 to 31.03.2026"
            />
          </Field>
          <Field label="New AMC period">
            <input
              disabled={disabled}
              value={value.newAmcPeriodText}
              onChange={(e) => set("newAmcPeriodText", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Status">
            <select
              disabled={disabled}
              value={value.status}
              onChange={(e) => set("status", e.target.value as "DUE" | "DONE")}
              className={inputClass}
            >
              <option value="DUE">DUE</option>
              <option value="DONE">DONE</option>
            </select>
          </Field>
        </div>
      </div>

      <Field label="Remarks">
        <textarea
          disabled={disabled}
          value={value.remarks}
          onChange={(e) => set("remarks", e.target.value)}
          rows={3}
          className={inputClass}
        />
      </Field>
    </div>
  );
}
