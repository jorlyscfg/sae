/*
  Warnings:

  - A unique constraint covering the columns `[filePath]` on the table `associated_documents` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "associated_documents_filename_key";

-- CreateIndex
CREATE UNIQUE INDEX "associated_documents_filePath_key" ON "associated_documents"("filePath");
