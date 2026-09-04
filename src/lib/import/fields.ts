// Client-safe: no exceljs import, so this can be used from both server parsing code and the
// browser-side mapping wizard UI.

export type CanonicalField =
  | "srNo"
  | "block"
  | "flatNo"
  | "address"
  | "siteName"
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
  block: "Block No",
  flatNo: "Flat No",
  address: "Address",
  siteName: "Site Name",
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

// Contact No. was deliberately removed from the importable fields: it is no longer shown or
// edited anywhere, so a sheet's contact column is simply left unmapped. The Unit.contactInfo
// column still holds what past uploads wrote — see the note on it in prisma/schema.prisma.
export const CANONICAL_FIELDS: CanonicalField[] = Object.keys(CANONICAL_FIELD_LABELS) as CanonicalField[];
