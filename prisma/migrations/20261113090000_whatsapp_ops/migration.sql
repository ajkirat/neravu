
-- AlterTable
ALTER TABLE "Owner" ADD COLUMN     "autoReceipts" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "billFrom" TIMESTAMP(3),
ADD COLUMN     "permanentAddress" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "handedOverAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "addedByName" TEXT;

-- AlterTable
ALTER TABLE "JoinRequest" ADD COLUMN     "permanentAddress" TEXT;

-- CreateTable
CREATE TABLE "ExpenseReceipt" (
    "expenseId" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseReceipt_pkey" PRIMARY KEY ("expenseId")
);

-- CreateTable
CREATE TABLE "PendingExpense" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "staffId" TEXT,
    "senderName" TEXT NOT NULL,
    "waFrom" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "mime" TEXT NOT NULL,
    "image" BYTEA NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaInbound" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaInbound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingExpense_waFrom_status_idx" ON "PendingExpense"("waFrom", "status");

-- CreateIndex
CREATE INDEX "PendingExpense_ownerId_createdAt_idx" ON "PendingExpense"("ownerId", "createdAt");

-- AddForeignKey
ALTER TABLE "ExpenseReceipt" ADD CONSTRAINT "ExpenseReceipt_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingExpense" ADD CONSTRAINT "PendingExpense_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
┌─────────────────────────────────────────────────────────┐
│  Update available 7.10.1 -> 8.0.0-rc.30                 │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘

