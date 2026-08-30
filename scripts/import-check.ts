import "dotenv/config";
import path from "node:path";
import ExcelJS from "exceljs";
import { detectHeaderRow, suggestColumnMapping, type ColumnMapping } from "@/lib/import/analyze";
import { parseSheetToUnits, resolveLastServiceDate } from "@/lib/import/parseSheet";

// This script hardcodes the mapping for the 4 sheets in the known real workbook, deliberately
// decoupled from the general admin-driven mapping wizard's DB-backed persistence. It exercises
// the exact same parsing engine (detectHeaderRow / parseSheetToUnits) the upload flow uses, just
// fed a hardcoded ColumnMapping instead of one loaded from a Project row. Re-run any time
// src/lib/import/* changes.
//
// Service-date columns are hardcoded by position rather than derived from header text, because
// the real "Projects " sheet has two corrupted Service Date headers (literal `0` and `9`) that
// header-text matching would silently miss — this is intentional, not an oversight.

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

interface SheetExpectation {
  sheetName: string;
  approxExpectedUnits: number;
  serviceDateColumns: number[];
}

const EXPECTATIONS: SheetExpectation[] = [
  { sheetName: "Projects ", approxExpectedUnits: 68, serviceDateColumns: range(9, 19) },
  { sheetName: "LA MARINA COMBINED LIST", approxExpectedUnits: 60, serviceDateColumns: range(9, 16) },
  { sheetName: "Sheet1", approxExpectedUnits: 37, serviceDateColumns: [9] },
  { sheetName: "Parshwa AMC ", approxExpectedUnits: 47, serviceDateColumns: range(9, 20) },
];

// Sheet1 has no header row at all — mapped by column position instead of header text.
const SHEET1_POSITIONAL_FIELDS: ColumnMapping["fields"] = {
  srNo: 1,
  block: 2,
  siteName: 3,
  contactInfo: 4,
  through: 5,
  type: 6,
  amcPeriodText: 7,
  newAmcPeriodText: 8,
  status: 10,
};

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run import-check -- <path-to-xlsx>");
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.resolve(filePath));

  for (const expectation of EXPECTATIONS) {
    const worksheet = workbook.getWorksheet(expectation.sheetName);
    if (!worksheet) {
      console.log(`\n=== "${expectation.sheetName}" === MISSING FROM WORKBOOK`);
      continue;
    }

    const detection = detectHeaderRow(worksheet);
    console.log(
      `\n=== "${expectation.sheetName}" === mode=${detection.mode} headerRow=${detection.headerRowIndex} dataStart=${detection.dataStartRowIndex}`
    );

    const mapping: ColumnMapping =
      detection.mode === "header"
        ? { ...suggestColumnMapping(worksheet, detection), serviceDateColumns: expectation.serviceDateColumns }
        : {
            mode: "positional",
            headerRowIndex: null,
            dataStartRowIndex: detection.dataStartRowIndex,
            fields: SHEET1_POSITIONAL_FIELDS,
            serviceDateColumns: expectation.serviceDateColumns,
          };

    console.log("  field mapping:", mapping.fields);

    const { units, stats } = parseSheetToUnits(worksheet, mapping);
    const withLastService = units.filter((u) => resolveLastServiceDate(u) !== null).length;

    console.log(
      `  rows scanned: ${stats.rowsScanned}, skipped blank: ${stats.rowsSkippedBlank}, units parsed: ${stats.unitCount} (reference target ~${expectation.approxExpectedUnits})`
    );
    console.log(
      `  service-date cells present: ${stats.totalDateCells}, unparsed: ${stats.unparsedDateCells}, units with a resolvable last-service date: ${withLastService}`
    );
    console.log(
      `  amc period cells present: ${stats.totalAmcPeriods}, unparsed (neither start nor end resolved): ${stats.unparsedAmcPeriods}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
