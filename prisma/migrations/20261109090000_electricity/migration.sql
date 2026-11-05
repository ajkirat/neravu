-- AlterTable
ALTER TABLE "Charge" ADD COLUMN     "billId" TEXT;

-- CreateTable
CREATE TABLE "ElectricityBill" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "prevReading" DOUBLE PRECISION,
    "currReading" DOUBLE PRECISION,
    "rate" DOUBLE PRECISION,
    "amount" INTEGER NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectricityBill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ElectricityBill_ownerId_period_idx" ON "ElectricityBill"("ownerId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "ElectricityBill_roomId_period_key" ON "ElectricityBill"("roomId", "period");

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_billId_fkey" FOREIGN KEY ("billId") REFERENCES "ElectricityBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityBill" ADD CONSTRAINT "ElectricityBill_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityBill" ADD CONSTRAINT "ElectricityBill_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

