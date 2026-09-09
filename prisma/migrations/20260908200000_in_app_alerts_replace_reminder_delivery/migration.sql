-- Reminders are now an in-app alert computed when a page is opened, so the stored reminder rows
-- and the email/SMS recipient settings have nothing left to do.
--
-- Safe to drop: both were introduced by the immediately preceding migration and never reached
-- production, so no reminder history or configured recipient is lost here.

-- DropForeignKey
ALTER TABLE "Reminder" DROP CONSTRAINT "Reminder_unitId_fkey";

-- AlterTable
ALTER TABLE "AppSettings" DROP COLUMN "reminderEmail",
DROP COLUMN "reminderPhone";

-- DropTable
DROP TABLE "Reminder";

-- DropEnum
DROP TYPE "ReminderKind";

-- DropEnum
DROP TYPE "ReminderStatus";

