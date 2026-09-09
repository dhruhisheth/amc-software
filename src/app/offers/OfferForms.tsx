"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, SectionHeading } from "@/components/form";
import { OFFER_STATUSES, computeOfferTotals, formatCurrency, lineAmount } from "@/lib/offer";
import { OFFER_STATUS_LABELS } from "@/components/Badges";
import type { OfferStatus } from "@/generated/prisma/enums";
import { createOffer, deleteOffer, updateOffer, type OfferInput, type OfferItemInput } from "./actions";

export interface ProjectOption {
  id: string;
  name: string;
}

const EMPTY_ITEM: OfferItemInput = { description: "", hp: "", unitRate: "" };

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
          .map((i) => ({ hp: Number(i.hp) || 0, unitRate: Number(i.unitRate) || 0 })),
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
    <form onSubmit={handleSubmit} className="card">
      <div className="page">
        <div>
          <SectionHeading>Customer</SectionHeading>
          <div className="form-grid cols-2">
            <Field label="Customer name">
              <input
                required
                disabled={readOnly}
                value={form.customerName}
                onChange={(e) => set("customerName", e.target.value)}
               
              />
            </Field>
            <Field label="Project">
              <select
                disabled={readOnly}
                value={form.projectId}
                onChange={(e) => set("projectId", e.target.value)}
               
              >
                <option value="">— None —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="span-all">
              <Field label="Customer address">
                <input
                  disabled={readOnly}
                  value={form.customerAddress}
                  onChange={(e) => set("customerAddress", e.target.value)}
                />
              </Field>
            </div>
            <div className="span-all">
              <Field label="Site address" hint="Printed on the offer as the site the AMC covers.">
                <input
                  disabled={readOnly}
                  value={form.siteAddress}
                  onChange={(e) => set("siteAddress", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>

        <div>
          <SectionHeading>Offer</SectionHeading>
          <div className="form-grid cols-3">
            <Field label="Offer date">
              <input
                type="date"
                disabled={readOnly}
                value={form.offerDate}
                onChange={(e) => set("offerDate", e.target.value)}
               
              />
            </Field>
            <Field label="Valid until">
              <input
                type="date"
                disabled={readOnly}
                value={form.validUntil}
                onChange={(e) => set("validUntil", e.target.value)}
               
              />
            </Field>
            <Field label="Status">
              <select
                disabled={readOnly}
                value={form.status}
                onChange={(e) => set("status", e.target.value as OfferStatus)}
               
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
               
              />
            </Field>
            <Field label="AMC period to">
              <input
                type="date"
                disabled={readOnly}
                value={form.periodEnd}
                onChange={(e) => set("periodEnd", e.target.value)}
               
              />
            </Field>
            <Field label="GST rate %">
              <input
                type="number"
                step="0.01"
                disabled={readOnly}
                value={form.taxPercent}
                onChange={(e) => set("taxPercent", e.target.value)}
              />
            </Field>
            <Field
              label="Equipment heading"
              hint={'Printed above the lines, e.g. "LG MAKE VRF SYSTEMS".'}
            >
              <input
                disabled={readOnly}
                value={form.systemHeading}
                onChange={(e) => set("systemHeading", e.target.value)}
              />
            </Field>
            <Field label="HSN / SAC code">
              <input
                disabled={readOnly}
                value={form.hsnCode}
                onChange={(e) => set("hsnCode", e.target.value)}
              />
            </Field>
            <Field label="Contract period terms">
              <input
                disabled={readOnly}
                value={form.contractTerm}
                onChange={(e) => set("contractTerm", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div>
          <div className="page-header">
            <SectionHeading>Line items</SectionHeading>
            {!readOnly && (
              <button
                type="button"
                onClick={() => set("items", [...form.items, { ...EMPTY_ITEM }])}
                className="back-link"
              >
                Add line
              </button>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr className="section-label">
                  <th>Description</th>
                  <th>HP</th>
                  <th>Rate/HP</th>
                  <th className="numeric">Grand Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        disabled={readOnly}
                        value={item.description}
                        onChange={(e) => setItem(i, { description: e.target.value })}
                       
                      />
                    </td>
                    <td>
                      <input
                        disabled={readOnly}
                        value={item.hp}
                        onChange={(e) => setItem(i, { hp: e.target.value })}
                       
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        disabled={readOnly}
                        value={item.unitRate}
                        onChange={(e) => setItem(i, { unitRate: e.target.value })}
                       
                      />
                    </td>
                    <td className="numeric">
                      {formatCurrency(
                        lineAmount({ hp: Number(item.hp) || 0, unitRate: Number(item.unitRate) || 0 })
                      )}
                    </td>
                    <td className="pt-3 align-top">
                      {!readOnly && form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => set("items", form.items.filter((_, idx) => idx !== i))}
                          className="link-button danger-text"
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

          <div className="offer-totals">
            <dl>
              <div className="row">
                <dt className="muted">Subtotal</dt>
                <dd>{formatCurrency(totals.subtotal)}</dd>
              </div>
              <div className="row">
                <dt className="muted">GST rate {form.taxPercent || 0}%</dt>
                <dd>{formatCurrency(totals.tax)}</dd>
              </div>
              <div className="row total">
                <dt>Net amount</dt>
                <dd>{formatCurrency(totals.total)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="form-grid cols-2">
          <Field label="Notes">
            <textarea
              disabled={readOnly}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
             
            />
          </Field>
          <Field label="Terms & conditions">
            <textarea
              disabled={readOnly}
              value={form.termsText}
              onChange={(e) => set("termsText", e.target.value)}
              rows={3}
             
            />
          </Field>
        </div>
      </div>

      {readOnly ? (
        <p className="hint">
          Your account has view-only access, so this offer cannot be changed.
        </p>
      ) : (
        <div className="form-actions">
          <button type="submit" disabled={pending} className="primary">
            {pending ? "Saving..." : mode === "create" ? "Generate offer" : "Save changes"}
          </button>
          <button type="button" onClick={() => router.back()}>
            Cancel
          </button>
          {saved && <span className="success-text">Saved.</span>}
          {error && <span className="error-text">{error}</span>}
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
      <button onClick={() => setConfirming(true)}>
        Delete
      </button>
    );
  }

  return (
    <span className="form-actions">
      <span className="error-text">Delete this offer?</span>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="danger-solid"
      >
        {pending ? "Deleting..." : "Yes, delete"}
      </button>
      <button onClick={() => setConfirming(false)}>
        Keep
      </button>
      {error && <span className="error-text">{error}</span>}
    </span>
  );
}
