import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import PedidosTable from "@/components/Funcional/PedidosTable";
import ProcessingBanner from "@/components/Funcional/ProcessingBanner";

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO:   "Rascunho",
  EM_REVISAO: "Em Revisão",
  CONCILIADO: "Conciliado",
  EXPORTADO:  "Exportado",
  CONCLUIDO:  "Concluído",
};

const STATUS_BADGE: Record<string, string> = {
  RASCUNHO:   "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  EM_REVISAO: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CONCILIADO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  EXPORTADO:  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  CONCLUIDO:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; page?: string; statusVoucher?: string; excluidos?: string; busca?: string }>;
}

export default async function FaturamentoDetailPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const tab = sp.tab ?? "pedidos";
  const page = Math.max(1, Number(sp.page ?? 1));
  const pageSize = 50;

  const faturamento = await prisma.faturamento.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          pedidos: true,
          divergencias: { where: { resolvido: false } },
        },
      },
    },
  });

  if (!faturamento) notFound();

  const fmt = (d: Date) => d.toLocaleDateString("pt-BR");
  const periodo = `${fmt(faturamento.dataInicio)} — ${fmt(faturamento.dataFechamento)}`;

  // Counts for summary cards
  const [totalPedidos, pedidosValidos, pedidosExcluidos, divergenciasPendentes, valorTotal] =
    await Promise.all([
      prisma.pedido.count({ where: { faturamentoId: id } }),
      prisma.pedido.count({ where: { faturamentoId: id, excluido: false } }),
      prisma.pedido.count({ where: { faturamentoId: id, excluido: true } }),
      prisma.divergencia.count({ where: { faturamentoId: id, resolvido: false } }),
      // Sum from Proteus (OrdemPagamento) — this is the actual billing amount
      prisma.ordemPagamento.aggregate({
        where: { faturamentoId: id },
        _sum: { valorTotal: true },
      }),
    ]);

  const valorTotalNum = Number(valorTotal._sum.valorTotal ?? 0);

  // Build pedidos filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    faturamentoId: id,
  };
  if (sp.statusVoucher && sp.statusVoucher !== "todos") {
    where.statusVoucher = sp.statusVoucher as "CONSULTADO" | "FINALIZADO" | "GLOSADO";
  }
  if (sp.excluidos === "sim") where.excluido = true;
  else if (sp.excluidos === "nao") where.excluido = false;
  if (sp.busca) {
    where.voucher = { contains: sp.busca, mode: "insensitive" };
  }

  const [pedidos, totalRows] = await Promise.all([
    prisma.pedido.findMany({
      where,
      include: {
        clinica: { select: { cnpj: true, razaoSocial: true, nomeFantasia: true } },
        medicamento: { select: { nome: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.pedido.count({ where }),
  ]);

  const totalPages = Math.ceil(totalRows / pageSize);

  const buildUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams({
      tab,
      page: String(page),
      ...(sp.statusVoucher ? { statusVoucher: sp.statusVoucher } : {}),
      ...(sp.excluidos ? { excluidos: sp.excluidos } : {}),
      ...(sp.busca ? { busca: sp.busca } : {}),
      ...overrides,
    });
    return `/faturamento/${id}?${p.toString()}`;
  };

  return (
    <div className="p-[25px]">
      {/* Processing banner while pipeline is running */}
      {(faturamento.status === "RASCUNHO" || faturamento.status === "EM_REVISAO") && (
        <ProcessingBanner faturamentoId={id} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/faturamento"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Faturamento — {periodo}
            </h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[faturamento.status] ?? ""}`}>
              {STATUS_LABEL[faturamento.status] ?? faturamento.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-8">
            Fechamento em {faturamento.dataFechamento.toLocaleDateString("pt-BR")}
          </p>
        </div>
        <Link
          href={`/faturamento/${id}/export`}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition"
        >
          <span className="material-symbols-outlined text-lg">download</span>
          Exportar
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total de Pedidos</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalPedidos}</p>
        </div>
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pedidos Válidos</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{pedidosValidos}</p>
        </div>
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pedidos Excluídos</p>
          <p className="text-2xl font-bold text-gray-500 dark:text-gray-400">{pedidosExcluidos}</p>
        </div>
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Divergências Pendentes</p>
          <p className={`text-2xl font-bold ${divergenciasPendentes > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
            {divergenciasPendentes}
          </p>
        </div>
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Valor Total</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {valorTotalNum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-[#1e2d47]">
        <Link
          href={`/faturamento/${id}?tab=pedidos`}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${
            tab === "pedidos"
              ? "text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 bg-primary-50 dark:bg-primary-900/10"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          Pedidos
          <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
            {totalPedidos}
          </span>
        </Link>
        <Link
          href={`/faturamento/${id}/divergencias`}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition flex items-center gap-2 ${
            tab === "divergencias"
              ? "text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 bg-primary-50 dark:bg-primary-900/10"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          Divergências
          {divergenciasPendentes > 0 && (
            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-semibold">
              {divergenciasPendentes}
            </span>
          )}
        </Link>
        <Link
          href={`/faturamento/${id}/export`}
          className="px-4 py-2.5 text-sm font-medium rounded-t-lg transition text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          Exportar
        </Link>
      </div>

      {/* Pedidos Tab Content */}
      <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-gray-100 dark:border-[#1e2d47] shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 dark:border-[#1e2d47] flex flex-wrap gap-3 items-center">
          <form className="flex flex-wrap gap-3 flex-1">
            <input type="hidden" name="tab" value="pedidos" />
            <input
              name="busca"
              defaultValue={sp.busca ?? ""}
              placeholder="Buscar voucher..."
              className="flex-1 min-w-[180px] text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a3a5c] bg-white dark:bg-[#0a1220] text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <select
              name="statusVoucher"
              defaultValue={sp.statusVoucher ?? "todos"}
              className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a3a5c] bg-white dark:bg-[#0a1220] text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="todos">Todos os status</option>
              <option value="FINALIZADO">Finalizado</option>
              <option value="CONSULTADO">Consultado</option>
              <option value="GLOSADO">Glosado</option>
            </select>
            <select
              name="excluidos"
              defaultValue={sp.excluidos ?? "todos"}
              className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a3a5c] bg-white dark:bg-[#0a1220] text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="todos">Todos</option>
              <option value="nao">Não excluídos</option>
              <option value="sim">Excluídos</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition font-medium"
            >
              Filtrar
            </button>
            <Link
              href={`/faturamento/${id}?tab=pedidos`}
              className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg border border-gray-200 dark:border-[#2a3a5c] transition"
            >
              Limpar
            </Link>
          </form>
          <p className="text-xs text-gray-400 whitespace-nowrap">
            {totalRows} resultado{totalRows !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Table */}
        <PedidosTable pedidos={pedidos} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-[#1e2d47] flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Página {page} de {totalPages} — {totalRows} pedidos
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#2a3a5c] rounded-lg hover:bg-gray-50 dark:hover:bg-[#0f1c35] transition"
                >
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#2a3a5c] rounded-lg hover:bg-gray-50 dark:hover:bg-[#0f1c35] transition"
                >
                  Próxima
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
