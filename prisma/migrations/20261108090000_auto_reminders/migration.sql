-- AlterTable
ALTER TABLE "Owner" ADD COLUMN     "autoReminders" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "remindBefore" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "remindOverdueEvery" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "tenantId" TEXT,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" INTEGER,
    "detail" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReminderLog_ownerId_sentAt_idx" ON "ReminderLog"("ownerId", "sentAt");

-- CreateIndex
CREATE INDEX "ReminderLog_tenantId_kind_sentAt_idx" ON "ReminderLog"("tenantId", "kind", "sentAt");

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

