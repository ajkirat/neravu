-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "duplicateOfId" TEXT,
ADD COLUMN     "mayBeDuplicate" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ExpenseReceipt" ADD COLUMN     "phash" TEXT,
ADD COLUMN     "sha256" TEXT;

-- CreateIndex
CREATE INDEX "ExpenseReceipt_sha256_idx" ON "ExpenseReceipt"("sha256");
