import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO:   "Rascunho",
  EM_REVISAO: "Em Revisão",
  CONCILIADO: "Conciliado",
  EXPORTADO:  "Exportado",
  CONCLUIDO:  "Concluído",
};

const STATUS_BADGE: Record<string, string> = {
  RASCUNHO:   "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  EM_REVISAO: "bg-yellow-100 text-yellow-700",
  CONCILIADO: "bg-blue-100 text-blue-700",
  EXPORTADO:  "bg-purple-100 text-purple-700",
  CONCLUIDO:  "bg-green-100 text-green-700",
};

function formatPeriodo(dataInicio: Date, dataFechamento: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR");
  return `${fmt(dataInicio)} — ${fmt(dataFechamento)}`;
}

export default async function FaturamentoListPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const faturamentos = await prisma.faturamento.findMany({
    orderBy: { dataInicio: "desc" },
    include: {
      _count: {
        select: {
          pedidos: true,
          divergencias: { where: { resolvido: false } },
        },
      },
    },
  });

  return (
    <div className="p-[25px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Faturamento</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Histórico de fechamentos J&amp;J
          </p>
        </div>
        <Link
          href="/faturamento/novo"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Novo Faturamento
        </Link>
      </div>

      {faturamentos.length === 0 ? (
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-12 text-center border border-gray-100 dark:border-[#1e2d47]">
          <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-5xl block mb-3">
            receipt_long
          </span>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum faturamento ainda</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            Inicie o primeiro fechamento
          </p>
          <Link
            href="/faturamento/novo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 transition"
          >
            <span className="material-symbols-outlined text-lg">upload_file</span>
            Iniciar Faturamento
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-gray-100 dark:border-[#1e2d47] overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#1e2d47]">
                <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">
                  Período
                </th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-4 text-center font-semibold text-gray-600 dark:text-gray-400">
                  Pedidos
                </th>
                <th className="px-6 py-4 text-center font-semibold text-gray-600 dark:text-gray-400">
                  Divergências
                </th>
                <th className="px-6 py-4 text-right font-semibold text-gray-600 dark:text-gray-400">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {faturamentos.map((fat) => (
                <tr
                  key={fat.id}
                  className="border-b border-gray-50 dark:border-[#1a2540] hover:bg-gray-50 dark:hover:bg-[#0f1c35] transition"
                >
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {formatPeriodo(fat.dataInicio, fat.dataFechamento)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[fat.status] ?? ""}`}>
                      {STATUS_LABEL[fat.status] ?? fat.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-300">
                    {fat._count.pedidos}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={fat._count.divergencias > 0 ? "text-red-600 dark:text-red-400 font-semibold" : "text-green-600 dark:text-green-400"}>
                      {fat._count.divergencias > 0 ? `⚠ ${fat._count.divergencias}` : "✓ 0"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/faturamento/${fat.id}`}
                      className="text-primary-500 hover:underline font-medium"
                    >
                      Abrir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
