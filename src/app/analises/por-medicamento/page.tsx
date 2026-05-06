import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import DateRangeFilter from "@/components/Funcional/DateRangeFilter";

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>;
}

function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s + "T12:00:00Z");
  return isNaN(d.getTime()) ? undefined : d;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PorMedicamentoPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const from = parseDate(sp.from);
  const to = parseDate(sp.to);

  const faturamentos = await prisma.faturamento.findMany({
    where: {
      ...(from ? { dataInicio: { gte: from } } : {}),
      ...(to ? { dataFechamento: { lte: to } } : {}),
    },
    select: { id: true },
  });
  const ids = faturamentos.map((f) => f.id);

  // Group pedidos by nomeExame
  const grupos = await prisma.pedido.groupBy({
    by: ["nomeExame"],
    where: ids.length > 0
      ? { faturamentoId: { in: ids }, excluido: false }
      : { id: "never" },
    _count: { _all: true },
    _sum: { valorUnitario: true },
    orderBy: { _count: { nomeExame: "desc" } },
  });

  const totalPedidos = grupos.reduce((a, g) => a + g._count._all, 0);

  const periodoLabel = sp.from || sp.to
    ? `${sp.from ? new Date(sp.from + "T12:00:00Z").toLocaleDateString("pt-BR") : "início"} — ${sp.to ? new Date(sp.to + "T12:00:00Z").toLocaleDateString("pt-BR") : "hoje"}`
    : "Todos os períodos";

  return (
    <div className="p-[25px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Análises — Por Medicamento</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Pedidos válidos agrupados por nome do exame/medicamento · {periodoLabel}
        </p>
      </div>

      <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm mb-6">
        <DateRangeFilter from={sp.from} to={sp.to} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total de Pedidos Válidos</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{totalPedidos}</p>
        </div>
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tipos de Exame/Medicamento</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{grupos.length}</p>
        </div>
      </div>

      {grupos.length === 0 ? (
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-12 text-center border border-gray-100 dark:border-[#1e2d47]">
          <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-5xl block mb-3">medication</span>
          <p className="text-gray-500 dark:text-gray-400">Nenhum dado para o período selecionado</p>
          <p className="text-xs text-gray-400 mt-1">
            Os dados de medicamento são preenchidos automaticamente no próximo upload.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-gray-100 dark:border-[#1e2d47] shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#1e2d47]">
                <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">#</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">Nome do Exame / Medicamento</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-600 dark:text-gray-400">Pedidos</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-600 dark:text-gray-400">% do Total</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-600 dark:text-gray-400">Valor Aut.</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g, i) => {
                const pct = totalPedidos > 0 ? (g._count._all / totalPedidos) * 100 : 0;
                const valor = g._sum.valorUnitario?.toNumber() ?? 0;
                return (
                  <tr key={i} className="border-b border-gray-50 dark:border-[#1a2540] hover:bg-gray-50 dark:hover:bg-[#0f1c35] transition">
                    <td className="px-6 py-3 text-gray-400 dark:text-gray-500 font-mono text-xs">{i + 1}</td>
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">
                      {g.nomeExame ?? <span className="text-gray-400 italic">Não identificado</span>}
                    </td>
                    <td className="px-6 py-3 text-center text-gray-700 dark:text-gray-300 font-semibold">
                      {g._count._all}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                          <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right text-gray-600 dark:text-gray-300 text-xs">
                      {valor > 0 ? fmt(valor) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
