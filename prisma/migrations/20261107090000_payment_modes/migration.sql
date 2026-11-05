-- AlterTable
ALTER TABLE "Owner" ADD COLUMN     "paymentMode" TEXT NOT NULL DEFAULT 'UPI',
ADD COLUMN     "razorpayEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "razorpayKeyId" TEXT,
ADD COLUMN     "razorpayKeySecretEnc" TEXT,
ADD COLUMN     "razorpayWebhookSecretEnc" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_externalId_key" ON "Payment"("externalId");

