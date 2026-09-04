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
        className="danger"
      >
        Delete flat
      </button>
    );
  }

  return (
    <div className="page-actions">
      <span className="error-text">Delete this flat and its service history?</span>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="danger-solid"
      >
        {pending ? "Deleting..." : "Yes, delete"}
      </button>
      <button
        onClick={() => setConfirming(false)}
       
      >
        Keep
      </button>
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}
