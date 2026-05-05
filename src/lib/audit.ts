import { prisma } from "@/lib/db";

interface AuditEntry {
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
}

export async function logAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        meta: entry.meta ? JSON.parse(JSON.stringify(entry.meta)) : undefined,
        ip: entry.ip ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] falha ao gravar log de auditoria", err);
  }
}

export function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}
