-- CreateTable
CREATE TABLE "Pitch" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "prospectName" TEXT NOT NULL,
    "prospectPhone" TEXT,
    "pgName" TEXT,
    "city" TEXT,
    "inputs" JSONB NOT NULL,
    "pains" TEXT[],
    "otherPains" TEXT,
    "wouldPay" INTEGER,
    "interest" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pitch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pitch_ownerId_createdAt_idx" ON "Pitch"("ownerId", "createdAt");

-- AddForeignKey
ALTER TABLE "Pitch" ADD CONSTRAINT "Pitch_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
