-- Migration: permite eventos de auditoria sem usuário associado.
--
-- Motivação: a trilha de auditoria passa a registrar eventos de autenticação
-- (login, falha de login, logout, bloqueio por rate limit). Tentativas de
-- login com e-mail inexistente ou bloqueadas por rate limit não têm usuário
-- vinculado, e a coluna "userId" era NOT NULL com FK RESTRICT.

-- 1. Torna a coluna opcional. A FK permanece com ON DELETE RESTRICT:
--    a mudança é apenas permitir eventos sem usuário, sem afetar a garantia
--    de que um usuário com trilha registrada não pode ser removido
--    fisicamente (o que causaria perda de atribuição na auditoria).
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;

-- 2. Índice por ação + data — suporta as consultas de segurança
--    ("todas as falhas de login nas últimas 24h") sem varrer a tabela.
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
