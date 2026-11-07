-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "idPhoto" BYTEA,
ADD COLUMN     "idPhotoMime" TEXT;

-- AlterTable
ALTER TABLE "JoinRequest" ADD COLUMN     "idPhoto" BYTEA,
ADD COLUMN     "idPhotoMime" TEXT;
