import UploadWizard from "./UploadWizard";

export default function UploadPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-xl font-semibold text-slate-900">Upload AMC Excel Sheet</h1>
      <p className="mt-1 text-sm text-slate-500">
        Upload the AMC workbook to refresh the dashboard. Each sheet becomes a project; sheets you&apos;ve
        uploaded before will reuse their saved column mapping automatically unless the layout changed.
      </p>
      <div className="mt-6">
        <UploadWizard />
      </div>
    </div>
  );
}
