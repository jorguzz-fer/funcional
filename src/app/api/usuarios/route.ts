import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireRole, ROLES_ADMIN } from "@/lib/authz";
import { logAudit, getClientIp } from "@/lib/audit";

const ROLES = ["ADMIN", "SUPERVISOR", "ANALYST", "VIEWER"] as const;

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
  role: z.enum(ROLES).default("ANALYST"),
});

export async function GET() {
  const auth = await requireRole(ROLES_ADMIN);
  if (auth.error) return auth.error;

  const usuarios = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ usuarios });
}

export async function POST(req: Request) {
  const auth = await requireRole(ROLES_ADMIN);
  if (auth.error) return auth.error;
  const { session } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const novo = await prisma.user.create({
    data: { name, email, passwordHash, role, active: true },
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  await logAudit({
    userId: session.user.id,
    action: "usuario.criar",
    entity: "User",
    entityId: novo.id,
    meta: { email, role },
    ip: getClientIp(req),
  });

  return NextResponse.json({ usuario: novo }, { status: 201 });
}
