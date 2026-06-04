-- AlterTable
ALTER TABLE "TreeRecord" ADD COLUMN "orpKod" INTEGER;

-- CreateIndex
CREATE INDEX "TreeRecord_createdById_orpKod_idx" ON "TreeRecord"("createdById", "orpKod");
