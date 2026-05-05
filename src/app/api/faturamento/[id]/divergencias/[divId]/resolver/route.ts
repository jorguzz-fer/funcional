import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, ROLES_WRITE } from "@/lib/authz";
import { logAudit, getClientIp } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string; divId: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  const { session, error } = await requireRole(ROLES_WRITE);
  if (error) return error;

  const { id: faturamentoId, divId } = await params;

  // Verify divergência belongs to the given faturamento
  const divergencia = await prisma.divergencia.findFirst({
    where: { id: divId, faturamentoId },
  });

  if (!divergencia) {
    return NextResponse.json(
      { error: "Divergência não encontrada" },
      { status: 404 },
    );
  }

  if (divergencia.resolvido) {
    return NextResponse.json(
      { error: "Divergência já está resolvida" },
      { status: 409 },
    );
  }

  // Parse body
  let body: { notas?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body is optional
  }

  const notas = typeof body.notas === "string" ? body.notas.trim() : null;

  // Update
  await prisma.divergencia.update({
    where: { id: divId },
    data: {
      resolvido: true,
      resolvidoPor: session!.user.name ?? session!.user.email,
      resolvidoEm: new Date(),
      notasResolucao: notas || null,
    },
  });

  // Audit log
  await logAudit({
    userId: session!.user.id,
    action: "divergencia.resolver",
    entity: "Divergencia",
    entityId: divId,
    meta: {
      faturamentoId,
      tipo: divergencia.tipo,
      notas: notas || undefined,
    },
    ip: getClientIp(req),
  });

  return NextResponse.json({ ok: true });
}
