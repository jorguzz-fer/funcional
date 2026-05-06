import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PorAnoPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const faturamentos = await prisma.faturamento.findMany({
    orderBy: { dataInicio: "asc" },
    include: {
      _count: {
        select: {
          pedidos: { where: { excluido: false } },
          divergencias: { where: { resolvido: false } },
        },
      },
      ordensGagamento: {
        select: { valorTotal: true },
      },
    },
  });

  // Group by year of dataInicio
  const byYear = new Map<number, {
    count: number;
    pedidosValidos: number;
    divergencias: number;
    valorProteus: number;
    faturamentos: typeof faturamentos;
  }>();

  for (const fat of faturamentos) {
    const year = fat.dataInicio.getFullYear();
    if (!byYear.has(year)) {
      byYear.set(year, { count: 0, pedidosValidos: 0, divergencias: 0, valorProteus: 0, faturamentos: [] });
    }
    const g = byYear.get(year)!;
    g.count++;
    g.pedidosValidos += fat._count.pedidos;
    g.divergencias += fat._count.divergencias;
    g.valorProteus += fat.ordensGagamento.reduce((a, o) => a + (o.valorTotal ? Number(o.valorTotal) : 0), 0);
    g.faturamentos.push(fat);
  }

  const years = [...byYear.keys()].sort((a, b) => b - a);

  return (
    <div className="p-[25px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Análises — Por Ano</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Histórico de fechamentos agrupados por ano
        </p>
      </div>

      {years.length === 0 ? (
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-12 text-center border border-gray-100 dark:border-[#1e2d47]">
          <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-5xl block mb-3">calendar_month</span>
          <p className="text-gray-500 dark:text-gray-400">Nenhum faturamento cadastrado ainda</p>
        </div>
      ) : (
        <div className="space-y-6">
          {years.map((year) => {
            const g = byYear.get(year)!;
            return (
              <div key={year} className="bg-white dark:bg-[#0d1526] rounded-2xl border border-gray-100 dark:border-[#1e2d47] shadow-sm overflow-hidden">
                {/* Year header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1e2d47] flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{year}</h2>
                  <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                    <span><strong className="text-gray-900 dark:text-white">{g.count}</strong> fechamentos</span>
                    <span><strong className="text-green-600 dark:text-green-400">{g.pedidosValidos}</strong> pedidos válidos</span>
                    {g.divergencias > 0 && (
                      <span><strong className="text-red-600 dark:text-red-400">{g.divergencias}</strong> divergências</span>
                    )}
                    <span className="font-semibold text-gray-900 dark:text-white">{fmt(g.valorProteus)}</span>
                  </div>
                </div>

                {/* Faturamentos table */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50 dark:border-[#1a2540]">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Período</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">Pedidos Válidos</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">Divergências</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Valor Proteus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.faturamentos.map((fat) => {
                      const valor = fat.ordensGagamento.reduce((a, o) => a + (o.valorTotal ? Number(o.valorTotal) : 0), 0);
                      const fmtD = (d: Date) => d.toLocaleDateString("pt-BR");
                      const statusColor: Record<string, string> = {
                        RASCUNHO: "bg-gray-100 text-gray-600",
                        EM_REVISAO: "bg-yellow-100 text-yellow-700",
                        CONCILIADO: "bg-blue-100 text-blue-700",
                        EXPORTADO: "bg-purple-100 text-purple-700",
                        CONCLUIDO: "bg-green-100 text-green-700",
                      };
                      const statusLabel: Record<string, string> = {
                        RASCUNHO: "Rascunho", EM_REVISAO: "Em Revisão",
                        CONCILIADO: "Conciliado", EXPORTADO: "Exportado", CONCLUIDO: "Concluído",
                      };
                      return (
                        <tr key={fat.id} className="border-b border-gray-50 dark:border-[#1a2540] hover:bg-gray-50 dark:hover:bg-[#0f1c35] transition">
                          <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">
                            {fmtD(fat.dataInicio)} — {fmtD(fat.dataFechamento)}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[fat.status] ?? ""}`}>
                              {statusLabel[fat.status] ?? fat.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center text-gray-600 dark:text-gray-300">{fat._count.pedidos}</td>
                          <td className="px-6 py-3 text-center">
                            <span className={fat._count.divergencias > 0 ? "text-red-600 dark:text-red-400 font-semibold" : "text-green-600 dark:text-green-400"}>
                              {fat._count.divergencias > 0 ? `⚠ ${fat._count.divergencias}` : "✓ 0"}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right font-semibold text-gray-900 dark:text-white">{fmt(valor)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
