import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireRole, ROLES_ADMIN } from "@/lib/authz";
import { logAudit, getClientIp } from "@/lib/audit";

const ROLES = ["ADMIN", "SUPERVISOR", "ANALYST", "VIEWER"] as const;

const patchSchema = z.object({
  name:     z.string().trim().min(2).max(100).optional(),
  role:     z.enum(ROLES).optional(),
  active:   z.boolean().optional(),
  password: z.string().min(8).max(200).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

async function adminCount(): Promise<number> {
  return prisma.user.count({ where: { role: "ADMIN", active: true } });
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireRole(ROLES_ADMIN);
  if (auth.error) return auth.error;
  const { session } = auth;

  const { id } = await params;
  const alvo = await prisma.user.findUnique({ where: { id } });
  if (!alvo) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Proteção: não permitir derrubar o último ADMIN ativo
  const removendoAdmin =
    alvo.role === "ADMIN" &&
    alvo.active &&
    ((data.role && data.role !== "ADMIN") || data.active === false);

  if (removendoAdmin) {
    const ativos = await adminCount();
    if (ativos <= 1) {
      return NextResponse.json(
        { error: "Não é possível remover o último ADMIN ativo" },
        { status: 400 },
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined)   updateData.name = data.name;
  if (data.role !== undefined)   updateData.role = data.role;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.password !== undefined) {
    updateData.passwordHash = await bcrypt.hash(data.password, 12);
  }

  const atualizado = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  await logAudit({
    userId: session.user.id,
    action: "usuario.editar",
    entity: "User",
    entityId: id,
    meta: {
      campos: Object.keys(updateData).filter((k) => k !== "passwordHash"),
      senhaAlterada: data.password !== undefined,
    },
    ip: getClientIp(req),
  });

  return NextResponse.json({ usuario: atualizado });
}

export async function DELETE(req: Request, { params }: Params) {
  const auth = await requireRole(ROLES_ADMIN);
  if (auth.error) return auth.error;
  const { session } = auth;

  const { id } = await params;
  const alvo = await prisma.user.findUnique({ where: { id } });
  if (!alvo) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  if (alvo.id === session.user.id) {
    return NextResponse.json(
      { error: "Você não pode desativar a si mesmo" },
      { status: 400 },
    );
  }

  if (alvo.role === "ADMIN" && alvo.active) {
    const ativos = await adminCount();
    if (ativos <= 1) {
      return NextResponse.json(
        { error: "Não é possível desativar o último ADMIN ativo" },
        { status: 400 },
      );
    }
  }

  // Soft delete: mantemos o registro para preservar AuditLog.userId
  await prisma.user.update({
    where: { id },
    data: { active: false },
  });

  await logAudit({
    userId: session.user.id,
    action: "usuario.desativar",
    entity: "User",
    entityId: id,
    meta: { email: alvo.email },
    ip: getClientIp(req),
  });

  return NextResponse.json({ ok: true });
}
