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
  updateReminderSettings,
  runRemindersNow,
  type CompanySettingsInput,
  type ReminderSettingsInput,
} from "./actions";
import { Field } from "@/components/form";
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
    <div className="card">
      <h2>Service &amp; renewal intervals</h2>
      <div className="form-grid cols-2">
        <label className="field">
          <span className="field-label">Default service interval (days)</span>
          <input
            type="number"
            value={interval}
            onChange={(e) => {
              setInterval(e.target.value);
              setSaved(false);
            }}
           
          />
        </label>
        <label className="field">
          <span className="field-label">Renewal alert lead time (days)</span>
          <input
            type="number"
            value={leadDays}
            onChange={(e) => {
              setLeadDays(e.target.value);
              setSaved(false);
            }}
           
          />
        </label>
      </div>
      <div className="form-actions">
        <button
          onClick={handleSave}
          disabled={pending}
          className="primary"
        >
          {pending ? "Saving..." : "Save"}
        </button>
        {saved && <span className="success-text">Saved — next-due dates recalculated.</span>}
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
    <tr>
      <td className="cell-strong">{name}</td>
      <td>
        <input
          type="number"
          placeholder="(use default)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
         
        />
      </td>
      <td>
        <button
          onClick={handleSave}
          disabled={pending}
          className="small"
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
    <form onSubmit={handleSubmit} className="filters">
      <label className="field">
        <span className="field-label">Name</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
         
        />
      </label>
      <label className="field">
        <span className="field-label">Email</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
         
        />
      </label>
      <label className="field">
        <span className="field-label">Temp password</span>
        <input
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
         
        />
      </label>
      <label className="field">
        <span className="field-label">Role</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
         
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <span className="field-hint">{ROLE_DESCRIPTIONS[role]}</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="primary"
      >
        {pending ? "Adding..." : "Add user"}
      </button>
      {error && <span className="error-text">{error}</span>}
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
      <div className="form-actions">
        <span className="badge owner">Owner</span>
        <span className="cell-sub">Always admin</span>
      </div>
    );
  }

  return (
    <div className="form-actions">
      <select
        value={role}
        disabled={pending || isSelf}
        onChange={(e) => handleChange(e.target.value as Role)}
       
        title={isSelf ? "You cannot change your own role." : ROLE_DESCRIPTIONS[role]}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {error && <span className="error-text">{error}</span>}
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
        className="link-button danger-text"
      >
        Remove
      </button>
    );
  }

  return (
    <span className="form-actions">
      <span className="error-text">Remove {name}?</span>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="danger-solid small"
      >
        {pending ? "Removing..." : "Yes"}
      </button>
      <button onClick={() => setConfirming(false)} className="link-button">
        Cancel
      </button>
      {error && <span className="error-text">{error}</span>}
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
    <div className="card">
      <h2>Company &amp; AMC offer defaults</h2>
      <p className="muted">
        These appear on the letterhead of every AMC offer, and prefill each new one.
      </p>
      <div className="form-grid cols-2">
        <Field label="Company name">
          <input
            value={form.companyName}
            onChange={(e) => set("companyName", e.target.value)}
           
          />
        </Field>
        <Field label="Address">
          <input
            value={form.companyAddress}
            onChange={(e) => set("companyAddress", e.target.value)}
           
          />
        </Field>
        <Field label="Phone">
          <input
            value={form.companyPhone}
            onChange={(e) => set("companyPhone", e.target.value)}
           
          />
        </Field>
        <Field label="Email">
          <input
            value={form.companyEmail}
            onChange={(e) => set("companyEmail", e.target.value)}
           
          />
        </Field>
        <Field label="HSN / SAC code">
          <input value={form.offerHsnCode} onChange={(e) => set("offerHsnCode", e.target.value)} />
        </Field>
        <Field label="Offer signatory">
          <input value={form.offerSignatory} onChange={(e) => set("offerSignatory", e.target.value)} />
        </Field>
        <Field label="City line">
          <input value={form.offerCityLine} onChange={(e) => set("offerCityLine", e.target.value)} />
        </Field>
        <Field label="State line">
          <input value={form.offerStateLine} onChange={(e) => set("offerStateLine", e.target.value)} />
        </Field>
        <Field label="Contract period terms">
          <input
            value={form.offerContractTerm}
            onChange={(e) => set("offerContractTerm", e.target.value)}
          />
        </Field>
        <div className="span-all">
          <Field label="Covering sentence" hint="The paragraph under &quot;Dear Sir&quot; on the offer.">
            <textarea
              rows={2}
              value={form.offerIntroText}
              onChange={(e) => set("offerIntroText", e.target.value)}
            />
          </Field>
        </div>
        <div className="span-all">
          <Field label="Footer note">
            <textarea
              rows={2}
              value={form.offerFooterNote}
              onChange={(e) => set("offerFooterNote", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Default GST rate %">
          <input
            type="number"
            step="0.01"
            value={form.offerTaxPercent}
            onChange={(e) => set("offerTaxPercent", e.target.value)}
           
          />
        </Field>
        <div className="span-all">
          <Field label="Default terms &amp; conditions">
            <textarea
              value={form.offerTermsText}
              onChange={(e) => set("offerTermsText", e.target.value)}
              rows={3}
             
            />
          </Field>
        </div>
      </div>
      <div className="form-actions">
        <button onClick={handleSave} disabled={pending} className="primary">
          {pending ? "Saving..." : "Save"}
        </button>
        {saved && <span className="success-text">Saved.</span>}
        {error && <span className="error-text">{error}</span>}
      </div>
    </div>
  );
}

export function ReminderSettingsForm({
  initial,
  emailReady,
  smsReady,
}: {
  initial: ReminderSettingsInput;
  emailReady: boolean;
  smsReady: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ReminderSettingsInput>(initial);
  const [pending, startTransition] = useTransition();
  const [running, startRun] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runSummary, setRunSummary] = useState<string | null>(null);

  function set<K extends keyof ReminderSettingsInput>(key: K, value: ReminderSettingsInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await updateReminderSettings(form);
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  function handleRunNow() {
    setError(null);
    setRunSummary(null);
    startRun(async () => {
      try {
        const r = await runRemindersNow();
        setRunSummary(
          `Raised ${r.raised}, sent ${r.sent}, skipped ${r.skipped}, failed ${r.failed}.` +
            (r.messages.length > 0 ? ` ${r.messages[0]}` : "")
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reminder run failed.");
      }
    });
  }

  return (
    <div className="card">
      <h3>Service &amp; renewal reminders</h3>
      <p>
        Four services a year are scheduled from each flat&apos;s AMC start date, one every three
        months. A reminder is raised {form.reminderLeadDays || 0} days before each service and
        before each contract renewal, and sent to the addresses below once a day.
      </p>

      <div className="form-grid cols-3">
        <Field label="Reminder email">
          <input
            type="email"
            value={form.reminderEmail}
            onChange={(e) => set("reminderEmail", e.target.value)}
            placeholder="(none)"
          />
        </Field>
        <Field label="Reminder phone">
          <input
            value={form.reminderPhone}
            onChange={(e) => set("reminderPhone", e.target.value)}
            placeholder="+91..."
          />
        </Field>
        <Field label="Days ahead">
          <input
            type="number"
            min="0"
            value={form.reminderLeadDays}
            onChange={(e) => set("reminderLeadDays", e.target.value)}
          />
        </Field>
      </div>

      <div className="reminder-status">
        <span className={emailReady ? "badge success" : "badge warning"}>
          Email {emailReady ? "ready" : "not configured"}
        </span>
        <span className={smsReady ? "badge success" : "badge warning"}>
          SMS {smsReady ? "ready" : "not configured"}
        </span>
      </div>
      {(!emailReady || !smsReady) && (
        <p className="field-hint">
          Reminders are still raised and listed under Service History whatever is configured. To
          have them actually delivered, set RESEND_API_KEY and REMINDER_FROM_EMAIL for email, or
          TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER for SMS.
        </p>
      )}

      <div className="form-actions">
        <button onClick={handleSave} disabled={pending} className="primary">
          {pending ? "Saving..." : "Save"}
        </button>
        <button onClick={handleRunNow} disabled={running}>
          {running ? "Running..." : "Run reminders now"}
        </button>
        {saved && <span className="success-text">Saved.</span>}
        {runSummary && <span className="muted">{runSummary}</span>}
        {error && <span className="error-text">{error}</span>}
      </div>
    </div>
  );
}
