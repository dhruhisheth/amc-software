"use client";

import type { UnitInput } from "@/lib/units";
import { Field, SectionHeading } from "@/components/form";

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
    <div className="page">
      <div>
        <SectionHeading>Location</SectionHeading>
        <div className="form-grid cols-3">
          <Field label="Block No">
            <input
              disabled={disabled}
              value={value.block}
              onChange={(e) => set("block", e.target.value)}
             
            />
          </Field>
          <Field label="Flat No">
            <input
              disabled={disabled}
              value={value.flatNo}
              onChange={(e) => set("flatNo", e.target.value)}
             
            />
          </Field>
          <Field label="Site / Owner name">
            <input
              disabled={disabled}
              value={value.siteName}
              onChange={(e) => set("siteName", e.target.value)}
             
            />
          </Field>
          <div className="span-all">
            <Field label="Address">
              <input
                disabled={disabled}
                value={value.address}
                onChange={(e) => set("address", e.target.value)}
               
              />
            </Field>
          </div>
        </div>
      </div>

      <div>
        <SectionHeading>Equipment</SectionHeading>
        <div className="form-grid cols-4">
          <Field label="HP">
            <input
              disabled={disabled}
              value={value.hp}
              onChange={(e) => set("hp", e.target.value)}
             
            />
          </Field>
          <Field label="Type">
            <input
              disabled={disabled}
              value={value.type}
              onChange={(e) => set("type", e.target.value)}
             
            />
          </Field>
          <Field label="Through (vendor)">
            <input
              disabled={disabled}
              value={value.through}
              onChange={(e) => set("through", e.target.value)}
             
            />
          </Field>
          <Field label="Bill No">
            <input
              disabled={disabled}
              value={value.billNo}
              onChange={(e) => set("billNo", e.target.value)}
             
            />
          </Field>
        </div>
      </div>

      <div>
        <SectionHeading>AMC contract</SectionHeading>
        <div className="form-grid cols-3">
          <Field label="Start AMC date">
            <input
              type="date"
              disabled={disabled}
              value={value.amcStartDate}
              onChange={(e) => set("amcStartDate", e.target.value)}
            />
          </Field>
          <Field label="End AMC date">
            <input
              type="date"
              disabled={disabled}
              value={value.amcEndDate}
              onChange={(e) => set("amcEndDate", e.target.value)}
            />
          </Field>
          <Field
            label="New AMC period"
            hint="The renewed contract's period, when there is one."
          >
            <input
              disabled={disabled}
              value={value.newAmcPeriodText}
              onChange={(e) => set("newAmcPeriodText", e.target.value)}
            />
          </Field>
        </div>
        <p className="field-hint">
          Four services a year are scheduled automatically from these dates, one every three
          months. Service dates, the next service due date and the DUE/DONE status all come from
          the service history below — they are not typed in here. The renewal date is the AMC end
          date.
        </p>
      </div>

      <Field label="Remarks">
        <textarea
          disabled={disabled}
          value={value.remarks}
          onChange={(e) => set("remarks", e.target.value)}
          rows={3}
         
        />
      </Field>
    </div>
  );
}
