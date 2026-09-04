"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProject, updateProject, deleteProject, type ProjectInput } from "./actions";

const EMPTY: ProjectInput = { name: "", address: "", serviceIntervalDaysOverride: "" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

function ProjectFields({
  value,
  onChange,
}: {
  value: ProjectInput;
  onChange: (next: ProjectInput) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Project name">
        <input
          required
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className={inputClass}
          placeholder="e.g. Shivalik Residency"
        />
      </Field>
      <Field label="Service interval override (days)">
        <input
          type="number"
          value={value.serviceIntervalDaysOverride}
          onChange={(e) => onChange({ ...value, serviceIntervalDaysOverride: e.target.value })}
          className={inputClass}
          placeholder="(use default)"
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Address">
          <input
            value={value.address}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
            className={inputClass}
            placeholder="Site address"
          />
        </Field>
      </div>
    </div>
  );
}

export function AddProjectPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProjectInput>(EMPTY);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const id = await createProject(form);
        setForm(EMPTY);
        setOpen(false);
        router.push(`/projects/${id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create project.");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Add project
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-900">New project</h2>
      <div className="mt-3">
        <ProjectFields value={form} onChange={setForm} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "Creating..." : "Create project"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

export function EditProjectPanel({
  projectId,
  initial,
  canDeleteProject,
}: {
  projectId: string;
  initial: ProjectInput;
  canDeleteProject: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProjectInput>(initial);
  const [pending, start] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        await updateProject(projectId, form);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update project.");
      }
    });
  }

  function handleDelete() {
    setError(null);
    startDelete(async () => {
      try {
        await deleteProject(projectId);
      } catch (err) {
        // A redirect from a server action surfaces here as a thrown control-flow signal; only
        // report genuine failures.
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) return;
        setError(err instanceof Error ? err.message : "Failed to delete project.");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Edit project
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-900">Edit project</h2>
      <div className="mt-3">
        <ProjectFields value={form} onChange={setForm} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setForm(initial);
            setError(null);
            setConfirmDelete(false);
          }}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        {canDeleteProject && !confirmDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="ml-auto rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete project
          </button>
        )}
        {canDeleteProject && confirmDelete && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-red-700">Delete this project and all its flats?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Keep
            </button>
          </div>
        )}
        {error && <span className="w-full text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
