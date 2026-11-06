-- AlterTable
ALTER TABLE "Owner" ADD COLUMN     "bankForwardNote" TEXT,
ADD COLUMN     "bankInbox" TEXT,
ADD COLUMN     "bankLast4" TEXT,
ADD COLUMN     "payConfirm" TEXT NOT NULL DEFAULT 'OWNER';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "payCode" INTEGER,
ADD COLUMN     "remindersPausedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "photo" BYTEA,
ADD COLUMN     "photoMime" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'OWNER';

-- CreateTable
CREATE TABLE "PaymentClaim" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paise" INTEGER NOT NULL DEFAULT 0,
    "utr" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentId" INTEGER,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankCredit" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "utr" TEXT,
    "payer" TEXT,
    "bank" TEXT,
    "status" TEXT NOT NULL,
    "tenantId" TEXT,
    "paymentId" INTEGER,
    "msgHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantRequest" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentClaim_ownerId_status_idx" ON "PaymentClaim"("ownerId", "status");

-- CreateIndex
CREATE INDEX "PaymentClaim_tenantId_status_idx" ON "PaymentClaim"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BankCredit_msgHash_key" ON "BankCredit"("msgHash");

-- CreateIndex
CREATE INDEX "BankCredit_ownerId_status_idx" ON "BankCredit"("ownerId", "status");

-- CreateIndex
CREATE INDEX "TenantRequest_ownerId_status_idx" ON "TenantRequest"("ownerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_bankInbox_key" ON "Owner"("bankInbox");

-- AddForeignKey
ALTER TABLE "PaymentClaim" ADD CONSTRAINT "PaymentClaim_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentClaim" ADD CONSTRAINT "PaymentClaim_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankCredit" ADD CONSTRAINT "BankCredit_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantRequest" ADD CONSTRAINT "TenantRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantRequest" ADD CONSTRAINT "TenantRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
