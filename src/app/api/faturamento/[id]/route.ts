import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, ROLES_ADMIN } from "@/lib/authz";
import { logAudit, getClientIp } from "@/lib/audit";
import { NextRequest } from "next/server";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireRole(ROLES_ADMIN);
  if (auth.error) return auth.error;
  const { session } = auth;

  const { id } = await params;

  const faturamento = await prisma.faturamento.findUnique({
    where: { id },
    select: { id: true, dataInicio: true, dataFechamento: true },
  });

  if (!faturamento) {
    return NextResponse.json({ error: "Faturamento não encontrado" }, { status: 404 });
  }

  // Delete in foreign-key order to satisfy constraints
  await prisma.divergencia.deleteMany({ where: { faturamentoId: id } });
  await prisma.conciliacao.deleteMany({ where: { faturamentoId: id } });
  await prisma.pedido.deleteMany({ where: { faturamentoId: id } });
  await prisma.ordemPagamento.deleteMany({ where: { faturamentoId: id } });
  await prisma.uploadArquivo.deleteMany({ where: { faturamentoId: id } });
  await prisma.faturamento.delete({ where: { id } });

  await logAudit({
    userId: session.user!.id as string,
    action: "faturamento.delete",
    entity: "Faturamento",
    entityId: id,
    meta: {
      dataInicio: faturamento.dataInicio.toISOString(),
      dataFechamento: faturamento.dataFechamento.toISOString(),
    },
    ip: getClientIp(req),
  });

  return NextResponse.json({ ok: true });
}
