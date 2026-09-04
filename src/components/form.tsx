// The shared form primitives. Every add/edit form in the app (projects, flats, complaints,
// technicians, offers) uses these so the controls look and behave identically.

export const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{children}</h3>;
}

export const primaryButtonClass =
  "rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50";

export const secondaryButtonClass =
  "rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export const dangerButtonClass =
  "rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50";
