import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/authz";
import { logAudit, getClientIp } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  senhaAtual: z.string().min(1).max(200),
  novaSenha:  z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  // Rate limit por usuário para evitar brute-force da senha atual
  const rl = await rateLimit({
    key: `senha:${session.user.id}`,
    windowSec: 900,
    max: 5,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Senha atual obrigatória e nova senha precisa ter ao menos 8 caracteres" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const ok = await bcrypt.compare(parsed.data.senhaAtual, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
  }

  if (parsed.data.senhaAtual === parsed.data.novaSenha) {
    return NextResponse.json(
      { error: "A nova senha precisa ser diferente da atual" },
      { status: 400 },
    );
  }

  const novoHash = await bcrypt.hash(parsed.data.novaSenha, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: novoHash },
  });

  await logAudit({
    userId: session.user.id,
    action: "perfil.trocar-senha",
    entity: "User",
    entityId: session.user.id,
    ip: getClientIp(req),
  });

  return NextResponse.json({ ok: true });
}
