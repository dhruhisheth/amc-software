-- CreateEnum
CREATE TYPE "ReminderKind" AS ENUM ('SERVICE_DUE', 'RENEWAL_DUE');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "AmcOffer" ADD COLUMN     "contractTerm" TEXT,
ADD COLUMN     "hsnCode" TEXT,
ADD COLUMN     "siteAddress" TEXT,
ADD COLUMN     "systemHeading" TEXT;

-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "offerCityLine" TEXT NOT NULL DEFAULT 'Ahmedabad',
ADD COLUMN     "offerContractTerm" TEXT NOT NULL DEFAULT 'One year from the date of PO and Payment',
ADD COLUMN     "offerFooterNote" TEXT NOT NULL DEFAULT 'Please note that all machines will be checked & repaired on chargeable basis before taking this into AMC.',
ADD COLUMN     "offerHsnCode" TEXT NOT NULL DEFAULT '995469',
ADD COLUMN     "offerIntroText" TEXT NOT NULL DEFAULT 'Please find herewith our most competitive Annual Maintenance Contract offer for comprehensive and four services in one year and any breakdown.',
ADD COLUMN     "offerSignatory" TEXT NOT NULL DEFAULT 'Mr. Dharmesh Sheth',
ADD COLUMN     "offerStateLine" TEXT NOT NULL DEFAULT 'Gujarat',
ADD COLUMN     "reminderEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "reminderLeadDays" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "reminderPhone" TEXT NOT NULL DEFAULT '+919099177770';

-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "technician2Id" TEXT;

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "kind" "ReminderKind" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "channel" TEXT,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reminder_status_idx" ON "Reminder"("status");

-- CreateIndex
CREATE INDEX "Reminder_dueDate_idx" ON "Reminder"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_unitId_kind_dueDate_key" ON "Reminder"("unitId", "kind", "dueDate");

-- CreateIndex
CREATE INDEX "Complaint_technician2Id_idx" ON "Complaint"("technician2Id");

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_technician2Id_fkey" FOREIGN KEY ("technician2Id") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
