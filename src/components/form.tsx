// The shared form primitives. Styling lives in globals.css as semantic classes, matching the
// warehouse app's approach — no utility classes anywhere in this codebase.

export function Field({
  label,
  hint,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return <span className="section-label">{children}</span>;
}

export function FormActions({ children }: { children: React.ReactNode }) {
  return <div className="form-actions">{children}</div>;
}
