-- Migration: múltiplos faturamentos por competência + identificação operacional do pedido.
--
-- 1. A operação registra vários faturamentos para o mesmo período (PSP, DSP,
--    Remi Card…), de forma independente. Cai a unicidade por período e entra
--    o rótulo "programa" para distinguir os registros.
DROP INDEX IF EXISTS "Faturamento_dataInicio_dataFechamento_key";
ALTER TABLE "Faturamento" ADD COLUMN "programa" TEXT;
CREATE INDEX IF NOT EXISTS "Faturamento_dataInicio_dataFechamento_idx" ON "Faturamento"("dataInicio", "dataFechamento");
CREATE INDEX IF NOT EXISTS "Faturamento_createdAt_idx" ON "Faturamento"("createdAt");

-- 2. "Pedido ID" do Autorizador (identificador que a operação reconhece, usado
--    nas divergências no lugar de ids técnicos) e CNPJ/nome de faturamento
--    vindos da planilha, para a conciliação por NF + CNPJ emissor não depender
--    de a clínica estar cadastrada.
ALTER TABLE "Pedido" ADD COLUMN "codigoPedido" TEXT;
ALTER TABLE "Pedido" ADD COLUMN "cnpjClinica" TEXT;
ALTER TABLE "Pedido" ADD COLUMN "nomeClinica" TEXT;
CREATE INDEX IF NOT EXISTS "Pedido_codigoPedido_idx" ON "Pedido"("codigoPedido");
