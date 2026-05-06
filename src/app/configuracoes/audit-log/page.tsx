import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";

const ACTION_LABEL: Record<string, string> = {
  "faturamento.create": "Criou Faturamento",
  "faturamento.delete": "Deletou Faturamento",
  "usuario.create":    "Criou Usuário",
  "usuario.update":    "Atualizou Usuário",
  "usuario.delete":    "Deletou Usuário",
  "usuario.activate":  "Ativou Usuário",
  "usuario.deactivate":"Desativou Usuário",
  "perfil.update":     "Atualizou Perfil",
  "perfil.senha":      "Alterou Senha",
};

const ACTION_COLOR: Record<string, string> = {
  "faturamento.create": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "faturamento.delete": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "usuario.delete":     "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "usuario.deactivate": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

interface Props {
  searchParams: Promise<{ page?: string; action?: string; userId?: string }>;
}

export default async function AuditLogPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  // ADMIN only
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") notFound();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const pageSize = 50;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (sp.action) where.action = sp.action;
  if (sp.userId) where.userId = sp.userId;

  const [logs, total, usuarios] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  const allActions = Object.keys(ACTION_LABEL);

  const buildUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams({
      ...(sp.action ? { action: sp.action } : {}),
      ...(sp.userId ? { userId: sp.userId } : {}),
      page: String(page),
      ...overrides,
    });
    return `/configuracoes/audit-log?${p.toString()}`;
  };

  return (
    <div className="p-[25px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Registro de todas as ações realizadas no sistema
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm mb-6">
        <form className="flex flex-wrap gap-3 items-center">
          <select
            name="action"
            defaultValue={sp.action ?? ""}
            className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a3a5c] bg-white dark:bg-[#0a1220] text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">Todas as ações</option>
            {allActions.map((a) => (
              <option key={a} value={a}>{ACTION_LABEL[a]}</option>
            ))}
          </select>
          <select
            name="userId"
            defaultValue={sp.userId ?? ""}
            className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a3a5c] bg-white dark:bg-[#0a1220] text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">Todos os usuários</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition"
          >
            Filtrar
          </button>
          {(sp.action || sp.userId) && (
            <Link
              href="/configuracoes/audit-log"
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-[#2a3a5c] rounded-lg transition"
            >
              Limpar
            </Link>
          )}
          <span className="ml-auto text-xs text-gray-400">{total} evento{total !== 1 ? "s" : ""}</span>
        </form>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-12 text-center border border-gray-100 dark:border-[#1e2d47]">
          <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-5xl block mb-3">history</span>
          <p className="text-gray-500 dark:text-gray-400">Nenhum evento registrado</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-gray-100 dark:border-[#1e2d47] shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-[#1e2d47]">
                  <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">Data/Hora</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">Usuário</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">Ação</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">Entidade</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 dark:border-[#1a2540] hover:bg-gray-50 dark:hover:bg-[#0f1c35] transition">
                    <td className="px-6 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono">
                      {log.createdAt.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{log.user.name}</p>
                      <p className="text-xs text-gray-400">{log.user.email}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLOR[log.action] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>
                        {ACTION_LABEL[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-600 dark:text-gray-300">
                      <span className="font-medium">{log.entity}</span>
                      {log.entityId && (
                        <span className="text-gray-400 ml-1 font-mono">{log.entityId.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-400">{log.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={buildUrl({ page: String(page - 1) })}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#2a3a5c] rounded-lg hover:bg-gray-50 dark:hover:bg-[#0f1c35] transition">
                    Anterior
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={buildUrl({ page: String(page + 1) })}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#2a3a5c] rounded-lg hover:bg-gray-50 dark:hover:bg-[#0f1c35] transition">
                    Próxima
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
