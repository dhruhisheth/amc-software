import UploadWizard from "./UploadWizard";

export default function UploadPage() {
  return (
    <div className="app-content narrow">
      <h1>Upload AMC Excel Sheet</h1>
      <p className="muted">
        Upload the AMC workbook to refresh the dashboard. Each sheet becomes a project; sheets you&apos;ve
        uploaded before will reuse their saved column mapping automatically unless the layout changed.
      </p>
      <div>
        <UploadWizard />
      </div>
    </div>
  );
}
