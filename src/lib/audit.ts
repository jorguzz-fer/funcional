import { prisma } from "@/lib/db";

interface AuditEntry {
  /** Null em eventos sem usuário identificado (ex.: login com e-mail inexistente). */
  userId: string | null;
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

// ─── Auditoria de autenticação ────────────────────────────────────────────────

/** Ações de autenticação registradas na trilha. */
export type AuthAction =
  | "auth.login"
  | "auth.login_failed"
  | "auth.logout"
  | "auth.rate_limited";

/**
 * Motivo da falha de autenticação.
 *
 * Registrado apenas na trilha de auditoria — NUNCA é devolvido ao cliente,
 * que recebe sempre erro genérico, para não permitir enumeração de contas.
 */
export type AuthFailureReason =
  | "invalid_input"
  | "user_not_found"
  | "user_inactive"
  | "invalid_password";

interface AuthEventEntry {
  action: AuthAction;
  userId?: string | null;
  /** E-mail tentado — necessário para detecção de ataque a conta específica. */
  email?: string | null;
  reason?: AuthFailureReason;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown>;
}

/**
 * Registra um evento de autenticação na trilha de auditoria.
 *
 * Nunca recebe nem registra a senha tentada. O e-mail é registrado por ser
 * indispensável à investigação de incidentes (identificar a conta alvo de um
 * ataque de força bruta).
 */
export async function logAuthEvent(entry: AuthEventEntry) {
  await logAudit({
    userId: entry.userId ?? null,
    action: entry.action,
    entity: "Auth",
    entityId: entry.userId ?? null,
    ip: entry.ip ?? null,
    meta: {
      ...(entry.email ? { email: entry.email } : {}),
      ...(entry.reason ? { reason: entry.reason } : {}),
      ...(entry.userAgent ? { userAgent: entry.userAgent.slice(0, 300) } : {}),
      ...entry.meta,
    },
  });
}

/** Extrai IP e user agent dos headers, tolerante a ausência. */
export function getRequestContext(headers: Headers | undefined | null): {
  ip: string | null;
  userAgent: string | null;
} {
  if (!headers?.get) return { ip: null, userAgent: null };
  const xff = headers.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0].trim() : headers.get("x-real-ip");
  return { ip: ip ?? null, userAgent: headers.get("user-agent") };
}
