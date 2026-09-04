"use client";

import { useState } from "react";
import {
  analyzeUpload,
  previewSheet,
  commitUpload,
  type AnalyzeResult,
  type SheetAnalysis,
  type PreviewResult,
  type CommitResult,
} from "./actions";
import { CANONICAL_FIELDS, CANONICAL_FIELD_LABELS, type CanonicalField } from "@/lib/import/fields";
import type { ColumnMapping } from "@/lib/import/analyze";

type ColumnChoice = CanonicalField | "serviceDate" | "";

function buildInitialChoices(mapping: ColumnMapping, columnCount: number): Record<number, ColumnChoice> {
  const choices: Record<number, ColumnChoice> = {};
  for (let c = 1; c <= columnCount; c++) choices[c] = "";
  for (const [field, col] of Object.entries(mapping.fields)) {
    if (typeof col === "number") choices[col] = field as CanonicalField;
  }
  for (const col of mapping.serviceDateColumns) choices[col] = "serviceDate";
  return choices;
}

function choicesToMapping(
  base: Pick<ColumnMapping, "mode" | "headerRowIndex" | "dataStartRowIndex">,
  choices: Record<number, ColumnChoice>
): ColumnMapping {
  const fields: Partial<Record<CanonicalField, number>> = {};
  const serviceDateColumns: number[] = [];
  const cols = Object.keys(choices)
    .map(Number)
    .sort((a, b) => a - b);

  for (const col of cols) {
    const choice = choices[col];
    if (choice === "") continue;
    if (choice === "serviceDate") serviceDateColumns.push(col);
    else fields[choice] = col;
  }

  return { ...base, fields, serviceDateColumns };
}

export default function UploadWizard() {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [choicesBySheet, setChoicesBySheet] = useState<Record<string, Record<number, ColumnChoice>>>({});
  const [previews, setPreviews] = useState<Record<string, PreviewResult | null>>({});
  const [previewLoading, setPreviewLoading] = useState<Record<string, boolean>>({});
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  async function handleAnalyze() {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const result = await analyzeUpload(fd);
      setAnalysis(result);
      const initialChoices: Record<string, Record<number, ColumnChoice>> = {};
      for (const sheet of result.sheets) {
        const maxCol = Math.max(1, ...sheet.columnPreviews.map((c) => c.colNumber));
        initialChoices[sheet.sheetName] = buildInitialChoices(sheet.mapping, maxCol);
      }
      setChoicesBySheet(initialChoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze file.");
    } finally {
      setAnalyzing(false);
    }
  }

  function currentMapping(sheet: SheetAnalysis): ColumnMapping {
    const choices = choicesBySheet[sheet.sheetName] ?? {};
    return choicesToMapping(sheet.mapping, choices);
  }

  async function handlePreview(sheet: SheetAnalysis) {
    if (!analysis) return;
    setPreviewLoading((p) => ({ ...p, [sheet.sheetName]: true }));
    setError(null);
    try {
      const mapping = currentMapping(sheet);
      const result = await previewSheet(analysis.pendingUploadId, sheet.sheetName, mapping);
      setPreviews((p) => ({ ...p, [sheet.sheetName]: result }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview sheet.");
    } finally {
      setPreviewLoading((p) => ({ ...p, [sheet.sheetName]: false }));
    }
  }

  async function handleCommit() {
    if (!analysis) return;
    setCommitting(true);
    setError(null);
    try {
      const sheetsInput = analysis.sheets.map((sheet) => ({
        sheetName: sheet.sheetName,
        normalizedName: sheet.normalizedName,
        mapping: currentMapping(sheet),
      }));
      const result = await commitUpload(analysis.pendingUploadId, analysis.fileName, sheetsInput);
      setCommitResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to commit upload.");
    } finally {
      setCommitting(false);
    }
  }

  if (commitResult) {
    return (
      <div className="card success-card">
        <h2 className="success-text">Upload complete</h2>
        <ul className="success-text">
          {commitResult.results.map((r) => (
            <li key={r.projectName}>
              {r.projectName}: {r.unitCount} units saved
            </li>
          ))}
        </ul>
        <button
          onClick={() => {
            setCommitResult(null);
            setAnalysis(null);
            setFile(null);
            setPreviews({});
            setChoicesBySheet({});
          }}
          className="primary"
        >
          Upload another file
        </button>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="card">
        <div>
          <label className="field-label">Excel file (.xlsx)</label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="field"
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button
          onClick={handleAnalyze}
          disabled={!file || analyzing}
          className="primary"
        >
          {analyzing ? "Analyzing..." : "Analyze"}
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      {error && <p className="error-text">{error}</p>}
      {analysis.sheets.map((sheet) => (
        <SheetCard
          key={sheet.sheetName}
          sheet={sheet}
          choices={choicesBySheet[sheet.sheetName] ?? {}}
          onChoicesChange={(next) => setChoicesBySheet((p) => ({ ...p, [sheet.sheetName]: next }))}
          preview={previews[sheet.sheetName] ?? null}
          previewLoading={!!previewLoading[sheet.sheetName]}
          onPreview={() => handlePreview(sheet)}
        />
      ))}
      <button
        onClick={handleCommit}
        disabled={committing}
        className="primary"
      >
        {committing ? "Saving..." : "Confirm & Save All"}
      </button>
    </div>
  );
}

function SheetCard({
  sheet,
  choices,
  onChoicesChange,
  preview,
  previewLoading,
  onPreview,
}: {
  sheet: SheetAnalysis;
  choices: Record<number, ColumnChoice>;
  onChoicesChange: (next: Record<number, ColumnChoice>) => void;
  preview: PreviewResult | null;
  previewLoading: boolean;
  onPreview: () => void;
}) {
  const [expanded, setExpanded] = useState(sheet.needsMapping);

  function setChoice(col: number, choice: ColumnChoice) {
    onChoicesChange({ ...choices, [col]: choice });
  }

  return (
    <div className="card">
      <div className="page-header">
        <div>
          <h3>{sheet.sheetName}</h3>
          <p className="muted">
            {sheet.existingProjectId
              ? sheet.needsMapping
                ? `Existing project "${sheet.existingProjectName}" — column layout changed, please review the mapping below`
                : `Existing project "${sheet.existingProjectName}" — saved mapping matched, ready to go`
              : "New project — please map its columns below"}
          </p>
        </div>
        <button onClick={() => setExpanded((v) => !v)} className="back-link">
          {expanded ? "Hide mapping" : "Edit mapping"}
        </button>
      </div>

      {expanded && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="pb-2 pr-4">Column</th>
                <th className="pb-2 pr-4">Header</th>
                <th className="pb-2 pr-4">Sample values</th>
                <th className="pb-2">Maps to</th>
              </tr>
            </thead>
            <tbody>
              {sheet.columnPreviews.map((col) => (
                <tr key={col.colNumber}>
                  <td className="muted">{col.colNumber}</td>
                  <td>
                    {col.headerText ?? <span className="muted">(none)</span>}
                  </td>
                  <td className="muted">{col.samples.join(", ") || "—"}</td>
                  <td>
                    <select
                      value={choices[col.colNumber] ?? ""}
                      onChange={(e) => setChoice(col.colNumber, e.target.value as ColumnChoice)}
                     
                    >
                      <option value="">Ignore</option>
                      <option value="serviceDate">Service Date (ordered)</option>
                      {CANONICAL_FIELDS.map((f) => (
                        <option key={f} value={f}>
                          {CANONICAL_FIELD_LABELS[f]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <button
          onClick={onPreview}
          disabled={previewLoading}
         
        >
          {previewLoading ? "Loading preview..." : "Preview this sheet"}
        </button>
      </div>

      {preview && (
        <div className="card">
          <p>
            {preview.stats.unitCount} units parsed from {preview.stats.rowsScanned} rows scanned (
            {preview.stats.rowsSkippedBlank} blank rows skipped).
          </p>
          <p>
            Service-date cells: {preview.stats.totalDateCells} ({preview.stats.unparsedDateCells} unparsed).
            AMC period cells: {preview.stats.totalAmcPeriods} ({preview.stats.unparsedAmcPeriods} unparsed).
          </p>
          {preview.sampleUnits.length > 0 && (
            <table>
              <thead>
                <tr className="muted">
                  <th className="pb-1 pr-3">Block</th>
                  <th className="pb-1 pr-3">Flat</th>
                  <th className="pb-1 pr-3">Site</th>
                  <th className="pb-1 pr-3">Through</th>
                  <th className="pb-1 pr-3">Status</th>
                  <th className="pb-1 pr-3">Last service</th>
                  <th className="pb-1">Visits</th>
                </tr>
              </thead>
              <tbody>
                {preview.sampleUnits.map((u, i) => (
                  <tr key={i}>
                    <td>{u.block ?? "—"}</td>
                    <td>{u.flatNo ?? "—"}</td>
                    <td>{u.siteName ?? "—"}</td>
                    <td>{u.through ?? "—"}</td>
                    <td>{u.status}</td>
                    <td>{u.lastServiceDate ?? "—"}</td>
                    <td>{u.visitCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
