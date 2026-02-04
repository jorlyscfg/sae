-- CreateTable
CREATE TABLE "associated_documents" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uuid" TEXT,
    "serie" TEXT,
    "folio" TEXT,
    "fecha" TIMESTAMP(3),
    "rfcEmisor" TEXT,
    "nombreEmisor" TEXT,
    "rfcReceptor" TEXT,
    "nombreReceptor" TEXT,
    "total" DECIMAL(15,2),
    "tipoDoc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "associated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "associated_documents_filename_key" ON "associated_documents"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "associated_documents_uuid_key" ON "associated_documents"("uuid");
