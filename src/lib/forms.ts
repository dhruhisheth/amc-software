// Small helpers shared by the server actions behind every add/edit form.
// Date parsing lives in ./date.ts (parseDateInput / toDateInputValue) — it belongs with the
// rest of the UTC-midnight calendar-date convention, not here.

/** Trim a form value, treating an all-whitespace string as "not provided". */
export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function requiredText(value: string | null | undefined, fieldLabel: string): string {
  const trimmed = emptyToNull(value);
  if (!trimmed) throw new Error(`${fieldLabel} is required.`);
  return trimmed;
}

export function parseNumber(value: string | null | undefined): number | null {
  const trimmed = emptyToNull(value);
  if (trimmed === null) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

/** Project and technician names are matched case- and whitespace-insensitively. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
