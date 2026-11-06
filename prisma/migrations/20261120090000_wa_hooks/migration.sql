-- CreateTable
CREATE TABLE "WaHook" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" TEXT NOT NULL,

    CONSTRAINT "WaHook_pkey" PRIMARY KEY ("id")
);
