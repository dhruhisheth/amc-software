"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateAppSettings,
  updateProjectInterval,
  createUser,
  updateUserRole,
  deleteUser,
  updateCompanySettings,
  type CompanySettingsInput,
} from "./actions";
import { Field, inputClass, primaryButtonClass } from "@/components/form";
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "@/lib/auth/permissions";

export function IntervalSettingsForm({
  defaultServiceIntervalDays,
  renewalAlertLeadDays,
}: {
  defaultServiceIntervalDays: number;
  renewalAlertLeadDays: number;
}) {
  const router = useRouter();
  const [interval, setInterval] = useState(String(defaultServiceIntervalDays));
  const [leadDays, setLeadDays] = useState(String(renewalAlertLeadDays));
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await updateAppSettings(Number(interval) || 90, Number(leadDays) || 30);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-900">Service &amp; renewal intervals</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Default service interval (days)</span>
          <input
            type="number"
            value={interval}
            onChange={(e) => {
              setInterval(e.target.value);
              setSaved(false);
            }}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Renewal alert lead time (days)</span>
          <input
            type="number"
            value={leadDays}
            onChange={(e) => {
              setLeadDays(e.target.value);
              setSaved(false);
            }}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved — next-due dates recalculated.</span>}
      </div>
    </div>
  );
}

export function ProjectIntervalRow({ id, name, override }: { id: string; name: string; override: number | null }) {
  const router = useRouter();
  const [value, setValue] = useState(override !== null ? String(override) : "");
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await updateProjectInterval(id, value.trim() ? Number(value) : null);
      router.refresh();
    });
  }

  return (
    <tr className="border-t border-slate-100">
      <td className="py-2 pr-4 font-medium text-slate-900">{name}</td>
      <td className="py-2 pr-4">
        <input
          type="number"
          placeholder="(use default)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="py-2">
        <button
          onClick={handleSave}
          disabled={pending}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save"}
        </button>
      </td>
    </tr>
  );
}

export function AddUserForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STAFF");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createUser(email, name, password, role);
        setEmail("");
        setName("");
        setPassword("");
        setRole("STAFF");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create user.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
      <label className="text-sm">
        <span className="block font-medium text-slate-700">Name</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-sm">
        <span className="block font-medium text-slate-700">Email</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-sm">
        <span className="block font-medium text-slate-700">Temp password</span>
        <input
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-sm">
        <span className="block font-medium text-slate-700">Role</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <span className="mt-1 block max-w-xs text-xs text-slate-400">{ROLE_DESCRIPTIONS[role]}</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add user"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </form>
  );
}

export function UserRoleToggle({
  userId,
  role,
  isSelf,
  isOwner,
}: {
  userId: string;
  role: Role;
  isSelf: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(newRole: Role) {
    setError(null);
    startTransition(async () => {
      try {
        await updateUserRole(userId, newRole);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update role.");
      }
    });
  }

  // The owner account is always admin and its role picker is inert — see lib/auth/root-admin.ts.
  if (isOwner) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-medium text-white">Owner</span>
        <span className="text-xs text-slate-400">Always admin</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        disabled={pending || isSelf}
        onChange={(e) => handleChange(e.target.value as Role)}
        className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
        title={isSelf ? "You cannot change your own role." : ROLE_DESCRIPTIONS[role]}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

export function DeleteUserButton({
  userId,
  name,
  isSelf,
  isOwner,
}: {
  userId: string;
  name: string;
  isSelf: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isOwner || isSelf) return null;

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteUser(userId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove user.");
      }
    });
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-red-600 hover:underline"
      >
        Remove
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="text-red-700">Remove {name}?</span>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="rounded-md bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "Removing..." : "Yes"}
      </button>
      <button onClick={() => setConfirming(false)} className="text-slate-500 hover:underline">
        Cancel
      </button>
      {error && <span className="text-red-600">{error}</span>}
    </span>
  );
}

export function CompanySettingsForm({ initial }: { initial: CompanySettingsInput }) {
  const router = useRouter();
  const [form, setForm] = useState<CompanySettingsInput>(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CompanySettingsInput>(key: K, value: CompanySettingsInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await updateCompanySettings(form);
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-900">Company &amp; AMC offer defaults</h2>
      <p className="mt-1 text-sm text-slate-500">
        These appear on the letterhead of every AMC offer, and prefill each new one.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Company name">
          <input
            value={form.companyName}
            onChange={(e) => set("companyName", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Address">
          <input
            value={form.companyAddress}
            onChange={(e) => set("companyAddress", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Phone">
          <input
            value={form.companyPhone}
            onChange={(e) => set("companyPhone", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Email">
          <input
            value={form.companyEmail}
            onChange={(e) => set("companyEmail", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Default tax %">
          <input
            type="number"
            step="0.01"
            value={form.offerTaxPercent}
            onChange={(e) => set("offerTaxPercent", e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Default terms &amp; conditions">
            <textarea
              value={form.offerTermsText}
              onChange={(e) => set("offerTermsText", e.target.value)}
              rows={3}
              className={inputClass}
            />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={handleSave} disabled={pending} className={primaryButtonClass}>
          {pending ? "Saving..." : "Save"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved.</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
