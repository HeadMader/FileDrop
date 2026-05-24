/*
  Warnings:

  - You are about to alter the column `fileSize` on the `Upload` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - A unique constraint covering the columns `[storageKey]` on the table `Upload` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Upload" ALTER COLUMN "mimeType" DROP NOT NULL,
ALTER COLUMN "fileSize" SET DATA TYPE INTEGER,
ALTER COLUMN "checksum" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Upload_storageKey_key" ON "Upload"("storageKey");

-- CreateIndex
CREATE INDEX "Upload_slug_idx" ON "Upload"("slug");
