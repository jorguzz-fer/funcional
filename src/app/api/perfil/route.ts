import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/authz";
import { logAudit, getClientIp } from "@/lib/audit";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

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

  const atualizado = await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
    select: { id: true, name: true, email: true, role: true },
  });

  await logAudit({
    userId: session.user.id,
    action: "perfil.editar",
    entity: "User",
    entityId: session.user.id,
    meta: { campo: "name" },
    ip: getClientIp(req),
  });

  return NextResponse.json({ usuario: atualizado });
}
