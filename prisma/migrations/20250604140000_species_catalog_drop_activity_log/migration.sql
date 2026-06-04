-- CreateTable
CREATE TABLE "Species" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "latinName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Species_latinName_key" ON "Species"("latinName");

-- Seed catalog from existing tree records
INSERT INTO "Species" ("id", "latinName", "sortOrder", "createdAt", "updatedAt")
SELECT
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    lower(hex(randomblob(6))),
    "speciesLatin",
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "TreeRecord"
GROUP BY "speciesLatin";

-- DropTable
DROP TABLE "ActivityLog";
