-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('DONE', 'PENDING');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ComplaintPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'VIEWER';

-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "companyAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "companyEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "companyName" TEXT NOT NULL DEFAULT 'Dhruvisha HVAC Systems Pvt. Ltd.',
ADD COLUMN     "companyPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "offerTaxPercent" DOUBLE PRECISION NOT NULL DEFAULT 18,
ADD COLUMN     "offerTermsText" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "address" TEXT;

-- AlterTable
ALTER TABLE "ServiceVisit" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "scheduledDate" TIMESTAMP(3),
ADD COLUMN     "status" "VisitStatus" NOT NULL DEFAULT 'DONE',
ADD COLUMN     "technicianId" TEXT;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "address" TEXT,
ADD COLUMN     "flatNo" TEXT,
ADD COLUMN     "renewalDueDateOverride" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Technician" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "phone" TEXT,
    "skills" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "ticketNo" TEXT NOT NULL,
    "projectId" TEXT,
    "unitId" TEXT,
    "complainantName" TEXT,
    "contactNumber" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "priority" "ComplaintPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "technicianId" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attendedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmcOffer" (
    "id" TEXT NOT NULL,
    "offerNo" TEXT NOT NULL,
    "projectId" TEXT,
    "unitId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerAddress" TEXT,
    "offerDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "notes" TEXT,
    "termsText" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmcOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmcOfferItem" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "hp" DOUBLE PRECISION,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitRate" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "AmcOfferItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Technician_normalizedName_key" ON "Technician"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_ticketNo_key" ON "Complaint"("ticketNo");

-- CreateIndex
CREATE INDEX "Complaint_projectId_idx" ON "Complaint"("projectId");

-- CreateIndex
CREATE INDEX "Complaint_unitId_idx" ON "Complaint"("unitId");

-- CreateIndex
CREATE INDEX "Complaint_technicianId_idx" ON "Complaint"("technicianId");

-- CreateIndex
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AmcOffer_offerNo_key" ON "AmcOffer"("offerNo");

-- CreateIndex
CREATE INDEX "AmcOffer_projectId_idx" ON "AmcOffer"("projectId");

-- CreateIndex
CREATE INDEX "AmcOffer_unitId_idx" ON "AmcOffer"("unitId");

-- CreateIndex
CREATE INDEX "AmcOffer_status_idx" ON "AmcOffer"("status");

-- CreateIndex
CREATE INDEX "AmcOfferItem_offerId_idx" ON "AmcOfferItem"("offerId");

-- CreateIndex
CREATE INDEX "ServiceVisit_status_idx" ON "ServiceVisit"("status");

-- CreateIndex
CREATE INDEX "ServiceVisit_technicianId_idx" ON "ServiceVisit"("technicianId");

-- CreateIndex
CREATE INDEX "Unit_renewalDueDateOverride_idx" ON "Unit"("renewalDueDateOverride");

-- AddForeignKey
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmcOffer" ADD CONSTRAINT "AmcOffer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmcOffer" ADD CONSTRAINT "AmcOffer_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmcOffer" ADD CONSTRAINT "AmcOffer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmcOfferItem" ADD CONSTRAINT "AmcOfferItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "AmcOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
