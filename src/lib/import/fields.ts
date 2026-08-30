// Client-safe: no exceljs import, so this can be used from both server parsing code and the
// browser-side mapping wizard UI.

export type CanonicalField =
  | "srNo"
  | "block"
  | "siteName"
  | "contactInfo"
  | "hp"
  | "through"
  | "type"
  | "amcPeriodText"
  | "newAmcPeriodText"
  | "billNo"
  | "remarks"
  | "lastServiceDate"
  | "status";

export const CANONICAL_FIELD_LABELS: Record<CanonicalField, string> = {
  srNo: "Sr No",
  block: "Block",
  siteName: "Site Name",
  contactInfo: "Contact Info",
  hp: "HP",
  through: "Through (vendor)",
  type: "Type",
  amcPeriodText: "AMC Period",
  newAmcPeriodText: "New AMC Period",
  billNo: "Bill No",
  remarks: "Remarks",
  lastServiceDate: "Last Service Date",
  status: "Status (DUE/DONE)",
};

export const CANONICAL_FIELDS: CanonicalField[] = Object.keys(CANONICAL_FIELD_LABELS) as CanonicalField[];
