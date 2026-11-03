-- Fotos mensuales congeladas de salud del parque (AssetHealthSnapshot).
-- Equivalente a 'npx prisma db push' para este cambio. Ejecutar una sola vez en el SQL Editor de Supabase.

-- CreateEnum
CREATE TYPE "HealthSnapshotSource" AS ENUM ('CIERRE', 'RECONSTRUIDO');

-- CreateTable
CREATE TABLE "AssetHealthSnapshot" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "dispenserId" TEXT NOT NULL,
    "clientId" TEXT,
    "ownerPlantId" TEXT,
    "locationPlantId" TEXT,
    "equipmentType" "EquipmentType" NOT NULL,
    "criticality" "AssetCriticality" NOT NULL,
    "score" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "mtbfDays" DOUBLE PRECISION NOT NULL,
    "mttrHours" DOUBLE PRECISION NOT NULL,
    "recurrences" INTEGER NOT NULL,
    "condition" DOUBLE PRECISION NOT NULL,
    "lifespanPct" DOUBLE PRECISION NOT NULL,
    "formulaVersion" INTEGER NOT NULL DEFAULT 1,
    "source" "HealthSnapshotSource" NOT NULL DEFAULT 'CIERRE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetHealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetHealthSnapshot_month_idx" ON "AssetHealthSnapshot"("month");

-- CreateIndex
CREATE INDEX "AssetHealthSnapshot_clientId_month_idx" ON "AssetHealthSnapshot"("clientId", "month");

-- CreateIndex
CREATE INDEX "AssetHealthSnapshot_ownerPlantId_month_idx" ON "AssetHealthSnapshot"("ownerPlantId", "month");

-- CreateIndex
CREATE INDEX "AssetHealthSnapshot_locationPlantId_month_idx" ON "AssetHealthSnapshot"("locationPlantId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "AssetHealthSnapshot_month_dispenserId_key" ON "AssetHealthSnapshot"("month", "dispenserId");

