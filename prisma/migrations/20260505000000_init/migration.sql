-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPERVISOR', 'ANALYST', 'VIEWER');

-- CreateEnum
CREATE TYPE "TipoMedicamento" AS ENUM ('INFUSAO', 'EXAME', 'APLICACAO');

-- CreateEnum
CREATE TYPE "StatusFaturamento" AS ENUM ('RASCUNHO', 'EM_REVISAO', 'CONCILIADO', 'EXPORTADO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "TipoArquivo" AS ENUM ('AUTORIZADOR', 'PROTEUS', 'RECLASSIFICACAO', 'PAGAMENTO_PONTUAL');

-- CreateEnum
CREATE TYPE "StatusVoucher" AS ENUM ('CONSULTADO', 'FINALIZADO', 'GLOSADO');

-- CreateEnum
CREATE TYPE "StatusOrdem" AS ENUM ('AGUARDANDO_NOTA_FISCAL', 'NOTA_FISCAL_EM_ANALISE', 'ENVIADA_PARA_FATURAMENTO');

-- CreateEnum
CREATE TYPE "StatusConciliacao" AS ENUM ('PENDENTE', 'OK', 'ATENCAO', 'RESOLVIDO');

-- CreateEnum
CREATE TYPE "TipoDivergencia" AS ENUM ('LINHA_FALTANTE', 'VALOR_DIVERGENTE', 'NF_ABREVIADA', 'CNPJ_DIFERENTE', 'RAZAO_SOCIAL_DIFERENTE', 'LOTE_AUSENTE', 'VOUCHER_SEM_FINALIZACAO', 'OUTRO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ANALYST',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinica" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "prazoFaturamento" INTEGER NOT NULL DEFAULT 90,
    "grandeRede" BOOLEAN NOT NULL DEFAULT false,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicamento" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeCliente" TEXT NOT NULL,
    "exigeLote" BOOLEAN NOT NULL DEFAULT false,
    "tipo" "TipoMedicamento" NOT NULL DEFAULT 'INFUSAO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Medicamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faturamento" (
    "id" TEXT NOT NULL,
    "mesReferencia" INTEGER NOT NULL,
    "anoReferencia" INTEGER NOT NULL,
    "dataFechamento" TIMESTAMP(3) NOT NULL,
    "status" "StatusFaturamento" NOT NULL DEFAULT 'RASCUNHO',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faturamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadArquivo" (
    "id" TEXT NOT NULL,
    "faturamentoId" TEXT NOT NULL,
    "tipo" "TipoArquivo" NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "linhasTotal" INTEGER,
    "processado" BOOLEAN NOT NULL DEFAULT false,
    "erros" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadArquivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "faturamentoId" TEXT NOT NULL,
    "clinicaId" TEXT,
    "voucher" TEXT NOT NULL,
    "articulacaoId" TEXT,
    "codigoPaciente" TEXT NOT NULL,
    "medicamentoId" TEXT,
    "servico" TEXT,
    "procedimento" TEXT,
    "procedimentoReclassificado" TEXT,
    "dataInfusao" TIMESTAMP(3),
    "dataFinalizacaoVoucher" TIMESTAMP(3),
    "dataFaturamento" TIMESTAMP(3),
    "ageDias" INTEGER,
    "valorUnitario" DECIMAL(12,2),
    "valorTotalOrdem" DECIMAL(12,2),
    "codigoOrdemPagamento" TEXT,
    "lote" TEXT,
    "dsp" TEXT,
    "numeroNotaFiscal" TEXT,
    "dataEnvioNota" TIMESTAMP(3),
    "dataEmissaoNota" TIMESTAMP(3),
    "statusVoucher" "StatusVoucher",
    "statusOrdemPagamento" "StatusOrdem",
    "incluidoManualmente" BOOLEAN NOT NULL DEFAULT false,
    "excluido" BOOLEAN NOT NULL DEFAULT false,
    "motivoExclusao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdemPagamento" (
    "id" TEXT NOT NULL,
    "faturamentoId" TEXT NOT NULL,
    "clinicaId" TEXT,
    "codigoOrdem" TEXT,
    "numeroNotaFiscal" TEXT,
    "valorTotal" DECIMAL(12,2),
    "cnpj" TEXT,
    "razaoSocial" TEXT,
    "status" TEXT,
    "dataEnvio" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdemPagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conciliacao" (
    "id" TEXT NOT NULL,
    "faturamentoId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "ordemId" TEXT,
    "status" "StatusConciliacao" NOT NULL DEFAULT 'PENDENTE',
    "valorAutorizador" DECIMAL(12,2),
    "valorProteus" DECIMAL(12,2),
    "diferenca" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conciliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Divergencia" (
    "id" TEXT NOT NULL,
    "faturamentoId" TEXT NOT NULL,
    "tipo" "TipoDivergencia" NOT NULL,
    "descricao" TEXT NOT NULL,
    "detalhe" JSONB,
    "valorAutorizador" DECIMAL(12,2),
    "valorProteus" DECIMAL(12,2),
    "resolvido" BOOLEAN NOT NULL DEFAULT false,
    "resolvidoPor" TEXT,
    "resolvidoEm" TIMESTAMP(3),
    "notasResolucao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Divergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitHit" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "hitAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Clinica_cnpj_key" ON "Clinica"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Medicamento_codigo_key" ON "Medicamento"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Faturamento_mesReferencia_anoReferencia_key" ON "Faturamento"("mesReferencia", "anoReferencia");

-- CreateIndex
CREATE INDEX "UploadArquivo_faturamentoId_idx" ON "UploadArquivo"("faturamentoId");

-- CreateIndex
CREATE INDEX "Pedido_faturamentoId_idx" ON "Pedido"("faturamentoId");

-- CreateIndex
CREATE INDEX "Pedido_voucher_idx" ON "Pedido"("voucher");

-- CreateIndex
CREATE INDEX "Pedido_codigoPaciente_idx" ON "Pedido"("codigoPaciente");

-- CreateIndex
CREATE INDEX "Pedido_clinicaId_idx" ON "Pedido"("clinicaId");

-- CreateIndex
CREATE INDEX "OrdemPagamento_faturamentoId_idx" ON "OrdemPagamento"("faturamentoId");

-- CreateIndex
CREATE INDEX "OrdemPagamento_codigoOrdem_idx" ON "OrdemPagamento"("codigoOrdem");

-- CreateIndex
CREATE UNIQUE INDEX "Conciliacao_pedidoId_key" ON "Conciliacao"("pedidoId");

-- CreateIndex
CREATE INDEX "Conciliacao_faturamentoId_status_idx" ON "Conciliacao"("faturamentoId", "status");

-- CreateIndex
CREATE INDEX "Divergencia_faturamentoId_resolvido_idx" ON "Divergencia"("faturamentoId", "resolvido");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "RateLimitHit_key_hitAt_idx" ON "RateLimitHit"("key", "hitAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadArquivo" ADD CONSTRAINT "UploadArquivo_faturamentoId_fkey" FOREIGN KEY ("faturamentoId") REFERENCES "Faturamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_faturamentoId_fkey" FOREIGN KEY ("faturamentoId") REFERENCES "Faturamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "Clinica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "Medicamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemPagamento" ADD CONSTRAINT "OrdemPagamento_faturamentoId_fkey" FOREIGN KEY ("faturamentoId") REFERENCES "Faturamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemPagamento" ADD CONSTRAINT "OrdemPagamento_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "Clinica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conciliacao" ADD CONSTRAINT "Conciliacao_faturamentoId_fkey" FOREIGN KEY ("faturamentoId") REFERENCES "Faturamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conciliacao" ADD CONSTRAINT "Conciliacao_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conciliacao" ADD CONSTRAINT "Conciliacao_ordemId_fkey" FOREIGN KEY ("ordemId") REFERENCES "OrdemPagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Divergencia" ADD CONSTRAINT "Divergencia_faturamentoId_fkey" FOREIGN KEY ("faturamentoId") REFERENCES "Faturamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

