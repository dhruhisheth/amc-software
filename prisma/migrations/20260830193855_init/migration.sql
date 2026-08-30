-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('DUE', 'DONE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "defaultServiceIntervalDays" INTEGER NOT NULL DEFAULT 90,
    "renewalAlertLeadDays" INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "columnMapping" JSONB,
    "headerHash" TEXT,
    "serviceIntervalDaysOverride" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceRowNumber" INTEGER NOT NULL,
    "srNoRaw" TEXT,
    "block" TEXT,
    "siteName" TEXT,
    "contactInfo" TEXT,
    "hp" DOUBLE PRECISION,
    "through" TEXT,
    "type" TEXT,
    "amcPeriodText" TEXT,
    "amcPeriodStart" TIMESTAMP(3),
    "amcPeriodEnd" TIMESTAMP(3),
    "newAmcPeriodText" TEXT,
    "newAmcPeriodStart" TIMESTAMP(3),
    "newAmcPeriodEnd" TIMESTAMP(3),
    "billNo" TEXT,
    "remarks" TEXT,
    "status" "UnitStatus" NOT NULL DEFAULT 'DUE',
    "statusManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "lastServiceDate" TIMESTAMP(3),
    "nextServiceDueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceVisit" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "visitDate" TIMESTAMP(3),
    "rawText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL,
    "warnings" JSONB,

    CONSTRAINT "UploadLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Project_normalizedName_key" ON "Project"("normalizedName");

-- CreateIndex
CREATE INDEX "Unit_projectId_idx" ON "Unit"("projectId");

-- CreateIndex
CREATE INDEX "Unit_nextServiceDueDate_idx" ON "Unit"("nextServiceDueDate");

-- CreateIndex
CREATE INDEX "Unit_amcPeriodEnd_idx" ON "Unit"("amcPeriodEnd");

-- CreateIndex
CREATE INDEX "Unit_newAmcPeriodEnd_idx" ON "Unit"("newAmcPeriodEnd");

-- CreateIndex
CREATE INDEX "ServiceVisit_unitId_idx" ON "ServiceVisit"("unitId");

-- CreateIndex
CREATE INDEX "UploadLog_projectId_idx" ON "UploadLog"("projectId");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadLog" ADD CONSTRAINT "UploadLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadLog" ADD CONSTRAINT "UploadLog_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
