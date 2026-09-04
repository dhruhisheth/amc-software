"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, SectionHeading, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/form";
import { OFFER_STATUSES, computeOfferTotals, formatCurrency } from "@/lib/offer";
import { OFFER_STATUS_LABELS } from "@/components/Badges";
import type { OfferStatus } from "@/generated/prisma/enums";
import { createOffer, deleteOffer, updateOffer, type OfferInput, type OfferItemInput } from "./actions";

export interface ProjectOption {
  id: string;
  name: string;
}

const EMPTY_ITEM: OfferItemInput = { description: "", hp: "", quantity: "1", unitRate: "" };

export function OfferForm({
  mode,
  offerId,
  initial,
  projects,
  readOnly = false,
}: {
  mode: "create" | "edit";
  offerId?: string;
  initial: OfferInput;
  projects: ProjectOption[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<OfferInput>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof OfferInput>(key: K, value: OfferInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function setItem(index: number, next: Partial<OfferItemInput>) {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) => (i === index ? { ...item, ...next } : item)),
    }));
    setSaved(false);
  }

  const totals = useMemo(
    () =>
      computeOfferTotals(
        form.items
          .filter((i) => i.description.trim())
          .map((i) => ({ quantity: Number(i.quantity) || 0, unitRate: Number(i.unitRate) || 0 })),
        Number(form.taxPercent) || 0
      ),
    [form.items, form.taxPercent]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        if (mode === "create") {
          const id = await createOffer(form);
          router.push(`/offers/${id}`);
        } else {
          await updateOffer(offerId!, form);
          setSaved(true);
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save offer.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="space-y-5">
        <div>
          <SectionHeading>Customer</SectionHeading>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Customer name">
              <input
                required
                disabled={readOnly}
                value={form.customerName}
                onChange={(e) => set("customerName", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Project">
              <select
                disabled={readOnly}
                value={form.projectId}
                onChange={(e) => set("projectId", e.target.value)}
                className={inputClass}
              >
                <option value="">— None —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Customer address">
                <input
                  disabled={readOnly}
                  value={form.customerAddress}
                  onChange={(e) => set("customerAddress", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </div>

        <div>
          <SectionHeading>Offer</SectionHeading>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Offer date">
              <input
                type="date"
                disabled={readOnly}
                value={form.offerDate}
                onChange={(e) => set("offerDate", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Valid until">
              <input
                type="date"
                disabled={readOnly}
                value={form.validUntil}
                onChange={(e) => set("validUntil", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Status">
              <select
                disabled={readOnly}
                value={form.status}
                onChange={(e) => set("status", e.target.value as OfferStatus)}
                className={inputClass}
              >
                {OFFER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {OFFER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="AMC period from">
              <input
                type="date"
                disabled={readOnly}
                value={form.periodStart}
                onChange={(e) => set("periodStart", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="AMC period to">
              <input
                type="date"
                disabled={readOnly}
                value={form.periodEnd}
                onChange={(e) => set("periodEnd", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Tax %">
              <input
                type="number"
                step="0.01"
                disabled={readOnly}
                value={form.taxPercent}
                onChange={(e) => set("taxPercent", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <SectionHeading>Line items</SectionHeading>
            {!readOnly && (
              <button
                type="button"
                onClick={() => set("items", [...form.items, { ...EMPTY_ITEM }])}
                className="text-sm text-slate-500 underline hover:text-slate-900"
              >
                Add line
              </button>
            )}
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-1 pr-2">Description</th>
                  <th className="w-20 pb-1 pr-2">HP</th>
                  <th className="w-20 pb-1 pr-2">Qty</th>
                  <th className="w-32 pb-1 pr-2">Rate</th>
                  <th className="w-32 pb-1 pr-2 text-right">Amount</th>
                  <th className="w-8 pb-1"></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, i) => (
                  <tr key={i}>
                    <td className="pr-2 align-top">
                      <input
                        disabled={readOnly}
                        value={item.description}
                        onChange={(e) => setItem(i, { description: e.target.value })}
                        className={inputClass}
                      />
                    </td>
                    <td className="pr-2 align-top">
                      <input
                        disabled={readOnly}
                        value={item.hp}
                        onChange={(e) => setItem(i, { hp: e.target.value })}
                        className={inputClass}
                      />
                    </td>
                    <td className="pr-2 align-top">
                      <input
                        type="number"
                        min="1"
                        disabled={readOnly}
                        value={item.quantity}
                        onChange={(e) => setItem(i, { quantity: e.target.value })}
                        className={inputClass}
                      />
                    </td>
                    <td className="pr-2 align-top">
                      <input
                        type="number"
                        step="0.01"
                        disabled={readOnly}
                        value={item.unitRate}
                        onChange={(e) => setItem(i, { unitRate: e.target.value })}
                        className={inputClass}
                      />
                    </td>
                    <td className="pr-2 pt-3 text-right align-top text-slate-600">
                      {formatCurrency((Number(item.quantity) || 0) * (Number(item.unitRate) || 0))}
                    </td>
                    <td className="pt-3 align-top">
                      {!readOnly && form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => set("items", form.items.filter((_, idx) => idx !== i))}
                          className="text-sm text-red-600 hover:underline"
                          aria-label="Remove line"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-end">
            <dl className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="text-slate-700">{formatCurrency(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Tax ({form.taxPercent || 0}%)</dt>
                <dd className="text-slate-700">{formatCurrency(totals.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
                <dt className="text-slate-700">Total</dt>
                <dd className="text-slate-900">{formatCurrency(totals.total)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Notes">
            <textarea
              disabled={readOnly}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className={inputClass}
            />
          </Field>
          <Field label="Terms & conditions">
            <textarea
              disabled={readOnly}
              value={form.termsText}
              onChange={(e) => set("termsText", e.target.value)}
              rows={3}
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      {readOnly ? (
        <p className="mt-4 text-sm text-slate-400">
          Your account has view-only access, so this offer cannot be changed.
        </p>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={primaryButtonClass}>
            {pending ? "Saving..." : mode === "create" ? "Generate offer" : "Save changes"}
          </button>
          <button type="button" onClick={() => router.back()} className={secondaryButtonClass}>
            Cancel
          </button>
          {saved && <span className="text-sm text-green-600">Saved.</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      )}
    </form>
  );
}

export function DeleteOfferButton({ offerId }: { offerId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    start(async () => {
      try {
        await deleteOffer(offerId);
      } catch (err) {
        // deleteOffer redirects on success, which surfaces here as a control-flow throw.
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) return;
        setError(err instanceof Error ? err.message : "Failed to delete offer.");
      }
    });
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className={secondaryButtonClass}>
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="text-red-700">Delete this offer?</span>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "Deleting..." : "Yes, delete"}
      </button>
      <button onClick={() => setConfirming(false)} className={secondaryButtonClass}>
        Keep
      </button>
      {error && <span className="text-red-600">{error}</span>}
    </span>
  );
}
