"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAppSettings, updateProjectInterval, createUser, updateUserRole } from "./actions";

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
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
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
          onChange={(e) => setRole(e.target.value as "ADMIN" | "STAFF")}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Admin</option>
        </select>
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

export function UserRoleToggle({ userId, role, isSelf }: { userId: string; role: "ADMIN" | "STAFF"; isSelf: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(newRole: "ADMIN" | "STAFF") {
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

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        disabled={pending || isSelf}
        onChange={(e) => handleChange(e.target.value as "ADMIN" | "STAFF")}
        className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
      >
        <option value="STAFF">Staff</option>
        <option value="ADMIN">Admin</option>
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
