import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import DateRangeFilter from "@/components/Funcional/DateRangeFilter";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>;
}

function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s + "T12:00:00Z");
  return isNaN(d.getTime()) ? undefined : d;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const statusColor: Record<string, string> = {
  RASCUNHO:   "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  EM_REVISAO: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CONCILIADO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  EXPORTADO:  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  CONCLUIDO:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const statusLabel: Record<string, string> = {
  RASCUNHO:   "Rascunho",
  EM_REVISAO: "Em Revisão",
  CONCILIADO: "Conciliado",
  EXPORTADO:  "Exportado",
  CONCLUIDO:  "Concluído",
};

export default async function DashboardPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const from = parseDate(sp.from);
  const to   = parseDate(sp.to);

  const faturamentos = await prisma.faturamento.findMany({
    where: {
      ...(from ? { dataInicio: { gte: from } } : {}),
      ...(to   ? { dataFechamento: { lte: to } } : {}),
    },
    orderBy: { dataInicio: "desc" },
    select: { id: true, dataInicio: true, dataFechamento: true, status: true },
  });

  const ids = faturamentos.map((f) => f.id);
  const whereIds = ids.length > 0 ? { faturamentoId: { in: ids } } : { id: "never" as string };

  const [totalPedidos, pedidosValidos, valorAggreg, divergenciasPendentes, agingOk, agingAtencao, agingUrgente] = await Promise.all([
    prisma.pedido.count({ where: whereIds }),
    prisma.pedido.count({ where: { ...whereIds, excluido: false } }),
    prisma.ordemPagamento.aggregate({ where: whereIds, _sum: { valorTotal: true } }),
    prisma.divergencia.count({ where: { ...whereIds, resolvido: false } }),
    // Aging buckets — apenas pedidos válidos (não excluídos)
    prisma.pedido.count({
      where: { ...whereIds, excluido: false, ageDias: { lte: 30 } },
    }),
    prisma.pedido.count({
      where: { ...whereIds, excluido: false, ageDias: { gt: 30, lte: 60 } },
    }),
    prisma.pedido.count({
      where: { ...whereIds, excluido: false, ageDias: { gt: 60, lte: 90 } },
    }),
  ]);

  const valorTotal = valorAggreg._sum.valorTotal?.toNumber() ?? 0;
  const faturamentoRecente = faturamentos[0] ?? null;

  const periodoLabel = sp.from || sp.to
    ? `${sp.from ? new Date(sp.from + "T12:00:00Z").toLocaleDateString("pt-BR") : "início"} — ${sp.to ? new Date(sp.to + "T12:00:00Z").toLocaleDateString("pt-BR") : "hoje"}`
    : "Todos os períodos";

  return (
    <div className="p-[25px]">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Faturamento J&amp;J · {periodoLabel}
        </p>
      </div>

      {/* Filtro de período */}
      <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm mb-6">
        <DateRangeFilter from={sp.from} to={sp.to} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-[25px] mb-[25px]">
        {/* Total de Pedidos */}
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-6 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-primary-600 dark:text-primary-400 text-xl">receipt_long</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total de Pedidos</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalPedidos.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-gray-400 mt-2">Incluindo excluídos</p>
        </div>

        {/* Pedidos Válidos */}
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-6 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-xl">check_circle</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pedidos Válidos</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{pedidosValidos.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-gray-400 mt-2">
            {totalPedidos > 0
              ? `${((pedidosValidos / totalPedidos) * 100).toFixed(1)}% do total`
              : "—"}
          </p>
        </div>

        {/* Valor Total Proteus */}
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-6 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">payments</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Valor Total (Proteus)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {valorTotal > 0 ? fmtBRL(valorTotal) : "—"}
          </p>
          <p className="text-xs text-gray-400 mt-2">Soma das ordens de pagamento</p>
        </div>

        {/* Divergências Pendentes */}
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-6 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-xl">warning</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Divergências Pendentes</p>
          <p className={`text-2xl font-bold mt-1 ${
            divergenciasPendentes > 0
              ? "text-red-600 dark:text-red-400"
              : "text-green-600 dark:text-green-400"
          }`}>
            {divergenciasPendentes.toLocaleString("pt-BR")}
          </p>
          {divergenciasPendentes > 0 && faturamentoRecente && (
            <Link href={`/faturamento/${faturamentoRecente.id}/divergencias`}
              className="text-xs text-red-500 hover:underline mt-2 inline-block">
              Resolver →
            </Link>
          )}
        </div>
      </div>

      {/* Faturamentos no período */}
      {faturamentos.length > 0 && (
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-gray-100 dark:border-[#1e2d47] shadow-sm overflow-hidden mb-[25px]">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1e2d47]">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Faturamentos no período
              <span className="ml-2 text-sm font-normal text-gray-400">({faturamentos.length})</span>
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#1e2d47]">
                <th className="px-6 py-3 text-left font-semibold text-gray-500 dark:text-gray-400">Período</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-500 dark:text-gray-400">Ação</th>
              </tr>
            </thead>
            <tbody>
              {faturamentos.map((f) => {
                const fmt = (d: Date) => d.toLocaleDateString("pt-BR");
                return (
                  <tr key={f.id} className="border-b border-gray-50 dark:border-[#1a2540] hover:bg-gray-50 dark:hover:bg-[#0f1c35] transition">
                    <td className="px-6 py-3 text-gray-800 dark:text-gray-200">
                      {fmt(f.dataInicio)} — {fmt(f.dataFechamento)}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusColor[f.status] ?? ""}`}>
                        {statusLabel[f.status] ?? f.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link href={`/faturamento/${f.id}`}
                        className="text-xs text-primary-500 hover:underline">
                        Ver detalhes →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Aging de Pedidos — Prazo de Faturamento */}
      <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-6 border border-gray-100 dark:border-[#1e2d47] shadow-sm mb-[25px]">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Aging de Pedidos — Prazo de Faturamento (90 dias)
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Distribuição dos pedidos válidos por faixa de dias entre infusão e fechamento. Pedidos com mais de 90 dias são automaticamente excluídos do faturamento.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/40">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {agingOk.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-gray-500 mt-1">até 30 dias</p>
            <p className="text-xs font-medium text-green-600 dark:text-green-400">OK</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/40">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {agingAtencao.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-gray-500 mt-1">31–60 dias</p>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Atenção</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/40">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {agingUrgente.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-gray-500 mt-1">61–90 dias</p>
            <p className="text-xs font-medium text-red-600 dark:text-red-400">Urgente</p>
          </div>
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-6 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/faturamento/novo"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-[#2a3a5c] hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition">
            <span className="material-symbols-outlined text-primary-500 text-xl">upload_file</span>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">Novo Faturamento</p>
              <p className="text-xs text-gray-500">Subir planilhas</p>
            </div>
          </Link>
          <Link href="/analises"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-[#2a3a5c] hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition">
            <span className="material-symbols-outlined text-primary-500 text-xl">bar_chart</span>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">Análises</p>
              <p className="text-xs text-gray-500">Por clínica e medicamento</p>
            </div>
          </Link>
          <Link href="/clinicas"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-[#2a3a5c] hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition">
            <span className="material-symbols-outlined text-primary-500 text-xl">local_hospital</span>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">Clínicas</p>
              <p className="text-xs text-gray-500">Credenciadas</p>
            </div>
          </Link>
          <Link href="/configuracoes"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-[#2a3a5c] hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition">
            <span className="material-symbols-outlined text-primary-500 text-xl">settings</span>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">Configurações</p>
              <p className="text-xs text-gray-500">Usuários e regras</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
