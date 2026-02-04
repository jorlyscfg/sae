-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "isFiscal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "status" TEXT;
