import ExcelJS from "exceljs";
import dayjs from "dayjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import {
  computeServiceBucket,
  computeRenewalBucket,
  resolveRenewalDueDate,
  SERVICE_BUCKET_LABELS,
  RENEWAL_BUCKET_LABELS,
} from "@/lib/status";
import { summarizeServiceHistory } from "@/lib/serviceHistory";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const [projects, appSettings] = await Promise.all([
    prisma.project.findMany({
      orderBy: { name: "asc" },
      include: { units: { include: { visits: { orderBy: { sequence: "asc" } } }, orderBy: { sourceRowNumber: "asc" } } },
    }),
    prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AMC Tracker";
  workbook.created = new Date();

  const now = new Date();
  const dateFmt = "dd mmm yyyy";

  for (const project of projects) {
    // Excel sheet names can't exceed 31 chars or contain []:*?/\\
    const sheetName = project.name.trim().slice(0, 31).replace(/[[\]:*?/\\]/g, " ") || "Sheet";
    const worksheet = workbook.addWorksheet(sheetName);

    const maxVisits = Math.max(0, ...project.units.map((u) => u.visits.length));
    const serviceDateHeaders = Array.from({ length: maxVisits }, (_, i) => `Service Date ${i + 1}`);

    worksheet.columns = [
      { header: "Sr No", key: "srNo", width: 8 },
      { header: "Block No", key: "block", width: 10 },
      { header: "Flat No", key: "flatNo", width: 10 },
      { header: "Address", key: "address", width: 30 },
      { header: "Site Name", key: "siteName", width: 30 },
      { header: "HP", key: "hp", width: 8 },
      { header: "Through", key: "through", width: 20 },
      { header: "Type", key: "type", width: 20 },
      { header: "AMC Period", key: "amcPeriodText", width: 25 },
      { header: "New AMC Period", key: "newAmcPeriodText", width: 25 },
      { header: "Bill No", key: "billNo", width: 12 },
      { header: "Remarks", key: "remarks", width: 20 },
      { header: "Status", key: "status", width: 10 },
      { header: "Manual Override", key: "manualOverride", width: 14 },
      { header: "Last Service Date", key: "lastServiceDate", width: 16 },
      { header: "Service Due Date", key: "nextServiceDueDate", width: 16 },
      { header: "Service Status", key: "serviceBucket", width: 14 },
      { header: "Renewal Due Date", key: "renewalDueDate", width: 16 },
      { header: "Renewal Status", key: "renewalBucket", width: 14 },
      { header: "Services Done", key: "servicesDone", width: 13 },
      { header: "Services Pending", key: "servicesPending", width: 15 },
      ...serviceDateHeaders.map((header, i) => ({ header, key: `serviceDate${i + 1}`, width: 14 })),
    ];
    worksheet.getRow(1).font = { bold: true };

    for (const unit of project.units) {
      const bucket = computeServiceBucket(unit.nextServiceDueDate, now);
      const renewalDue = resolveRenewalDueDate(unit);
      const renewalBucket = computeRenewalBucket(renewalDue, now, appSettings.renewalAlertLeadDays);
      const history = summarizeServiceHistory(unit.visits, now);

      const row: Record<string, unknown> = {
        srNo: unit.srNoRaw,
        block: unit.block,
        flatNo: unit.flatNo,
        address: unit.address,
        siteName: unit.siteName,
        hp: unit.hp,
        through: unit.through,
        type: unit.type,
        amcPeriodText: unit.amcPeriodText,
        newAmcPeriodText: unit.newAmcPeriodText,
        billNo: unit.billNo,
        remarks: unit.remarks,
        status: unit.status,
        manualOverride: unit.statusManualOverride ? "Yes" : "",
        lastServiceDate: unit.lastServiceDate,
        nextServiceDueDate: unit.nextServiceDueDate,
        serviceBucket: SERVICE_BUCKET_LABELS[bucket],
        renewalDueDate: renewalDue,
        renewalBucket: RENEWAL_BUCKET_LABELS[renewalBucket],
        servicesDone: history.doneCount,
        servicesPending: history.pendingCount,
      };

      history.entries.forEach((entry, i) => {
        row[`serviceDate${i + 1}`] = entry.date ?? entry.rawText ?? null;
      });

      const addedRow = worksheet.addRow(row);
      for (const key of ["lastServiceDate", "nextServiceDueDate", "renewalDueDate"]) {
        const cell = addedRow.getCell(key);
        if (cell.value instanceof Date) cell.numFmt = dateFmt;
      }
      history.entries.forEach((entry, i) => {
        if (entry.date) {
          const cell = addedRow.getCell(`serviceDate${i + 1}`);
          cell.numFmt = dateFmt;
          // Pending visits are dates too, but they are plans, not records — tint them so the
          // sheet doesn't read as if the work was already done.
          if (entry.status === "PENDING") {
            cell.font = { color: { argb: "FFB45309" }, italic: true };
          }
        }
      });
    }
  }

  if (projects.length === 0) {
    workbook.addWorksheet("No data");
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `AMC-Tracker-Export-${dayjs().format("YYYY-MM-DD")}.xlsx`;

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
