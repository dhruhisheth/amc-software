"use server";

import ExcelJS from "exceljs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { detectHeaderRow, suggestColumnMapping, buildColumnPreviews, computeHeaderHash } from "@/lib/import/analyze";
import type { ColumnMapping, ColumnPreview } from "@/lib/import/analyze";
import { parseSheetToUnits, resolveLastServiceDate } from "@/lib/import/parseSheet";
import type { ParseStats } from "@/lib/import/parseSheet";
import { addCalendarDays, formatCalendarDate } from "@/lib/date";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Admin access required.");
  }
  return session;
}

function normalizeProjectName(sheetName: string): string {
  return sheetName.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface SheetAnalysis {
  sheetName: string;
  normalizedName: string;
  existingProjectId: string | null;
  existingProjectName: string | null;
  needsMapping: boolean;
  mapping: ColumnMapping;
  columnPreviews: ColumnPreview[];
}

export interface AnalyzeResult {
  pendingUploadId: string;
  fileName: string;
  sheets: SheetAnalysis[];
}

export async function analyzeUpload(formData: FormData): Promise<AnalyzeResult> {
  const session = await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("No file provided.");
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Only .xlsx files are supported.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const pendingUpload = await prisma.pendingUpload.create({
    data: {
      fileName: file.name,
      fileData: buffer,
      uploadedById: session.user.id,
    },
  });

  const workbook = new ExcelJS.Workbook();
  // exceljs's bundled types declare a Buffer shape from a different @types/node version than
  // ours; the value is a real Buffer/Uint8Array at runtime either way.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs Buffer typing mismatch, see comment above
  await workbook.xlsx.load(buffer as any);

  const sheets: SheetAnalysis[] = [];

  for (const worksheet of workbook.worksheets) {
    const normalizedName = normalizeProjectName(worksheet.name);
    const detection = detectHeaderRow(worksheet);
    const computedHash = computeHeaderHash(worksheet, detection);
    const columnPreviews = buildColumnPreviews(worksheet, detection);

    const existingProject = await prisma.project.findUnique({ where: { normalizedName } });

    let mapping: ColumnMapping;
    let needsMapping: boolean;

    if (existingProject?.columnMapping && existingProject.headerHash === computedHash) {
      mapping = existingProject.columnMapping as unknown as ColumnMapping;
      needsMapping = false;
    } else if (existingProject?.columnMapping) {
      // Header shape changed since the last upload — start from the previous mapping so the
      // admin only has to adjust what changed, not rebuild it from scratch.
      mapping = existingProject.columnMapping as unknown as ColumnMapping;
      needsMapping = true;
    } else {
      mapping = suggestColumnMapping(worksheet, detection);
      needsMapping = true;
    }

    sheets.push({
      sheetName: worksheet.name,
      normalizedName,
      existingProjectId: existingProject?.id ?? null,
      existingProjectName: existingProject?.name ?? null,
      needsMapping,
      mapping,
      columnPreviews,
    });
  }

  return { pendingUploadId: pendingUpload.id, fileName: file.name, sheets };
}

export interface PreviewResult {
  stats: ParseStats;
  sampleUnits: Array<{
    block: string | null;
    flatNo: string | null;
    siteName: string | null;
    through: string | null;
    status: string;
    lastServiceDate: string | null;
    visitCount: number;
  }>;
}

export async function previewSheet(
  pendingUploadId: string,
  sheetName: string,
  mapping: ColumnMapping
): Promise<PreviewResult> {
  await requireAdmin();

  const pending = await prisma.pendingUpload.findUniqueOrThrow({ where: { id: pendingUploadId } });
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs Buffer typing mismatch
  await workbook.xlsx.load(pending.fileData as any);
  const worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) throw new Error(`Sheet "${sheetName}" not found in uploaded file.`);

  const { units, stats } = parseSheetToUnits(worksheet, mapping);

  const sampleUnits = units.slice(0, 5).map((u) => {
    const lastServiceDate = resolveLastServiceDate(u);
    return {
      block: u.block,
      flatNo: u.flatNo,
      siteName: u.siteName,
      through: u.through,
      status: u.status,
      lastServiceDate: formatCalendarDate(lastServiceDate),
      visitCount: u.visits.length,
    };
  });

  return { stats, sampleUnits };
}

export interface CommitSheetInput {
  sheetName: string;
  normalizedName: string;
  mapping: ColumnMapping;
}

export interface CommitResult {
  results: Array<{ projectName: string; unitCount: number }>;
}

export async function commitUpload(
  pendingUploadId: string,
  fileName: string,
  sheets: CommitSheetInput[]
): Promise<CommitResult> {
  const session = await requireAdmin();

  const pending = await prisma.pendingUpload.findUniqueOrThrow({ where: { id: pendingUploadId } });
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs Buffer typing mismatch
  await workbook.xlsx.load(pending.fileData as any);

  const appSettings = await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const results: Array<{ projectName: string; unitCount: number }> = [];

  for (const sheetInput of sheets) {
    const worksheet = workbook.getWorksheet(sheetInput.sheetName);
    if (!worksheet) throw new Error(`Sheet "${sheetInput.sheetName}" not found in uploaded file.`);

    const detection = { mode: sheetInput.mapping.mode, headerRowIndex: sheetInput.mapping.headerRowIndex, dataStartRowIndex: sheetInput.mapping.dataStartRowIndex };
    const headerHash = computeHeaderHash(worksheet, detection);
    const { units, stats } = parseSheetToUnits(worksheet, sheetInput.mapping);

    await prisma.$transaction(async (tx) => {
      const project = await tx.project.upsert({
        where: { normalizedName: sheetInput.normalizedName },
        update: {
          name: sheetInput.sheetName,
          columnMapping: sheetInput.mapping as unknown as object,
          headerHash,
        },
        create: {
          name: sheetInput.sheetName,
          normalizedName: sheetInput.normalizedName,
          columnMapping: sheetInput.mapping as unknown as object,
          headerHash,
        },
      });

      // Full replace: re-uploading a sheet is the source of truth ("Excel always wins"). This
      // also naturally clears any in-app manual status overrides for this project, by design.
      await tx.unit.deleteMany({ where: { projectId: project.id } });

      const effectiveIntervalDays = project.serviceIntervalDaysOverride ?? appSettings.defaultServiceIntervalDays;

      for (const unit of units) {
        const lastServiceDate = resolveLastServiceDate(unit);
        const nextServiceDueDate = lastServiceDate
          ? addCalendarDays(lastServiceDate, effectiveIntervalDays)
          : null;

        await tx.unit.create({
          data: {
            projectId: project.id,
            sourceRowNumber: unit.sourceRowNumber,
            srNoRaw: unit.srNoRaw,
            block: unit.block,
            flatNo: unit.flatNo,
            address: unit.address,
            siteName: unit.siteName,
            hp: unit.hp,
            through: unit.through,
            type: unit.type,
            amcPeriodText: unit.amcPeriodText,
            amcPeriodStart: unit.amcPeriodStart,
            amcPeriodEnd: unit.amcPeriodEnd,
            newAmcPeriodText: unit.newAmcPeriodText,
            newAmcPeriodStart: unit.newAmcPeriodStart,
            newAmcPeriodEnd: unit.newAmcPeriodEnd,
            billNo: unit.billNo,
            remarks: unit.remarks,
            status: unit.status,
            statusManualOverride: false,
            lastServiceDate,
            nextServiceDueDate,
            visits: {
              create: unit.visits.map((v) => ({
                sequence: v.sequence,
                // Dates on an uploaded sheet are visits that already happened.
                status: "DONE" as const,
                visitDate: v.visitDate,
                rawText: v.rawText,
              })),
            },
          },
        });
      }

      await tx.uploadLog.create({
        data: {
          projectId: project.id,
          fileName,
          uploadedById: session.user.id,
          rowCount: units.length,
          warnings: {
            skippedBlankRows: stats.rowsSkippedBlank,
            unparsedDateCells: stats.unparsedDateCells,
            unparsedAmcPeriods: stats.unparsedAmcPeriods,
          },
        },
      });

      results.push({ projectName: project.name, unitCount: units.length });
    });
  }

  await prisma.pendingUpload.delete({ where: { id: pendingUploadId } });

  return { results };
}
