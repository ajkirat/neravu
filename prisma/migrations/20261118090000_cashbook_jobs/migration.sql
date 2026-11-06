-- CreateTable
CREATE TABLE "DayClose" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "cashCounted" INTEGER,
    "note" TEXT,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayClose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringJob" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "propertyId" TEXT,
    "title" TEXT NOT NULL,
    "everyDays" INTEGER NOT NULL,
    "nextDue" TIMESTAMP(3) NOT NULL,
    "lastDone" TIMESTAMP(3),
    "lastDoneBy" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DayClose_ownerId_day_key" ON "DayClose"("ownerId", "day");

-- CreateIndex
CREATE INDEX "RecurringJob_ownerId_nextDue_idx" ON "RecurringJob"("ownerId", "nextDue");

-- AddForeignKey
ALTER TABLE "DayClose" ADD CONSTRAINT "DayClose_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringJob" ADD CONSTRAINT "RecurringJob_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
