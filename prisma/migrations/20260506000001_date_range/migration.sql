-- Migration: replace mes/ano with explicit date range (dataInicio + dataFechamento)
-- Also purges all test data per user request.

-- 1. Delete all faturamento-related data (cascade order)
DELETE FROM "Divergencia";
DELETE FROM "Conciliacao";
DELETE FROM "Pedido";
DELETE FROM "OrdemPagamento";
DELETE FROM "UploadArquivo";
DELETE FROM "Faturamento";

-- 2. Drop old unique index
DROP INDEX IF EXISTS "Faturamento_mesReferencia_anoReferencia_key";

-- 3. Add new column (nullable first so ALTER is safe)
ALTER TABLE "Faturamento" ADD COLUMN "dataInicio" TIMESTAMP(3);

-- 4. Drop old columns
ALTER TABLE "Faturamento" DROP COLUMN "mesReferencia";
ALTER TABLE "Faturamento" DROP COLUMN "anoReferencia";

-- 5. Enforce NOT NULL (table is empty, so this is safe)
ALTER TABLE "Faturamento" ALTER COLUMN "dataInicio" SET NOT NULL;

-- 6. Add new unique constraint
CREATE UNIQUE INDEX "Faturamento_dataInicio_dataFechamento_key" ON "Faturamento"("dataInicio", "dataFechamento");
