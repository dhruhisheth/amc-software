"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/form";
import { createProject, updateProject, deleteProject, type ProjectInput } from "./actions";

const EMPTY: ProjectInput = { name: "", address: "", serviceIntervalDaysOverride: "" };

function ProjectFields({
  value,
  onChange,
}: {
  value: ProjectInput;
  onChange: (next: ProjectInput) => void;
}) {
  return (
    <div className="form-grid cols-2">
      <Field label="Project name">
        <input
          required
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
         
          placeholder="e.g. Shivalik Residency"
        />
      </Field>
      <Field label="Service interval override (days)">
        <input
          type="number"
          value={value.serviceIntervalDaysOverride}
          onChange={(e) => onChange({ ...value, serviceIntervalDaysOverride: e.target.value })}
         
          placeholder="(use default)"
        />
      </Field>
      <div className="span-all">
        <Field label="Address">
          <input
            value={value.address}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
           
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
        className="primary"
      >
        Add project
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h3>New project</h3>
      <div>
        <ProjectFields value={form} onChange={setForm} />
      </div>
      <div className="form-actions">
        <button
          type="submit"
          disabled={pending}
          className="primary"
        >
          {pending ? "Creating..." : "Create project"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          
        >
          Cancel
        </button>
        {error && <span className="error-text">{error}</span>}
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
        
      >
        Edit project
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h3>Edit project</h3>
      <div>
        <ProjectFields value={form} onChange={setForm} />
      </div>
      <div className="form-actions">
        <button
          type="submit"
          disabled={pending}
          className="primary"
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
          
        >
          Cancel
        </button>
        {canDeleteProject && !confirmDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="danger spacer"
          >
            Delete project
          </button>
        )}
        {canDeleteProject && confirmDelete && (
          <div className="form-actions spacer">
            <span className="error-text">Delete this project and all its flats?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="danger-solid"
            >
              {deleting ? "Deleting..." : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              
            >
              Keep
            </button>
          </div>
        )}
        {error && <span className="error-text">{error}</span>}
      </div>
    </form>
  );
}
