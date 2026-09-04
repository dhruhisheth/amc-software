"use client";

import { useState, useTransition } from "react";
import { deleteUnit } from "./actions";

export default function DeleteUnitButton({ unitId }: { unitId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    start(async () => {
      try {
        await deleteUnit(unitId);
      } catch (err) {
        // The server action redirects on success, which surfaces here as a control-flow throw.
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) return;
        setError(err instanceof Error ? err.message : "Failed to delete flat.");
      }
    });
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        Delete flat
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-red-700">Delete this flat and its service history?</span>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "Deleting..." : "Yes, delete"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        Keep
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
