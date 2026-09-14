import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, ROLES_WRITE } from "@/lib/authz";
import { logAudit, getClientIp } from "@/lib/audit";
import { processamentoEmAndamento } from "@/lib/faturamento/upload";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * Exclui um faturamento (conciliação) e todos os dados derivados dele.
 *
 * Liberado para quem pode criar faturamentos (ADMIN, SUPERVISOR, ANALYST):
 * quem sobe uma planilha errada precisa poder desfazer. Toda exclusão fica
 * registrada na trilha de auditoria com o usuário e o período.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireRole(ROLES_WRITE);
  if (auth.error) return auth.error;
  const { session } = auth;

  const { id } = await params;

  const faturamento = await prisma.faturamento.findUnique({
    where: { id },
    select: {
      id: true,
      dataInicio: true,
      dataFechamento: true,
      status: true,
      updatedAt: true,
      uploads: { select: { erros: true } },
    },
  });

  if (!faturamento) {
    return NextResponse.json({ error: "Faturamento não encontrado" }, { status: 404 });
  }

  if (processamentoEmAndamento(faturamento)) {
    return NextResponse.json(
      { error: "As planilhas deste faturamento ainda estão sendo processadas. Aguarde a conclusão para excluir." },
      { status: 409 },
    );
  }

  // Delete in foreign-key order, atomically (tudo ou nada)
  await prisma.$transaction([
    prisma.divergencia.deleteMany({ where: { faturamentoId: id } }),
    prisma.conciliacao.deleteMany({ where: { faturamentoId: id } }),
    prisma.pedido.deleteMany({ where: { faturamentoId: id } }),
    prisma.ordemPagamento.deleteMany({ where: { faturamentoId: id } }),
    prisma.uploadArquivo.deleteMany({ where: { faturamentoId: id } }),
    prisma.faturamento.delete({ where: { id } }),
  ]);

  await logAudit({
    userId: session.user!.id as string,
    action: "faturamento.delete",
    entity: "Faturamento",
    entityId: id,
    meta: {
      dataInicio: faturamento.dataInicio.toISOString(),
      dataFechamento: faturamento.dataFechamento.toISOString(),
      status: faturamento.status,
    },
    ip: getClientIp(req),
  });

  return NextResponse.json({ ok: true });
}
