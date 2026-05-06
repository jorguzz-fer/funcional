import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function ReclassificacoesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const medicamentos = await prisma.medicamento.findMany({
    orderBy: { nome: "asc" },
    include: {
      _count: { select: { pedidos: true } },
    },
  });

  return (
    <div className="p-[25px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reclassificações</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Mapeamento do nome interno do Autorizador para o nome aceito pela J&amp;J
        </p>
      </div>

      {/* Info card */}
      <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/40 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-500 text-xl flex-shrink-0 mt-0.5">info</span>
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-medium mb-1">Como funciona a reclassificação</p>
          <p className="text-blue-700 dark:text-blue-400">
            O Autorizador pode exportar nomes de medicamentos diferentes dos aceitos pela J&amp;J.
            O campo <strong>Nome Cliente</strong> é o nome que aparecerá na planilha exportada.
            Medicamentos marcados como <strong>Exige Lote</strong> geram alerta se o número de lote estiver ausente.
          </p>
        </div>
      </div>

      {medicamentos.length === 0 ? (
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-12 text-center border border-gray-100 dark:border-[#1e2d47]">
          <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-5xl block mb-3">medication</span>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum medicamento cadastrado</p>
          <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
            Cadastre os medicamentos para habilitar alertas de lote e a reclassificação automática de nomes no export.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-gray-100 dark:border-[#1e2d47] shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#1e2d47]">
                <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">Código</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">Nome (Autorizador)</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">Nome Cliente (J&J)</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-600 dark:text-gray-400">Tipo</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-600 dark:text-gray-400">Exige Lote</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-600 dark:text-gray-400">Pedidos</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-600 dark:text-gray-400">Ativo</th>
              </tr>
            </thead>
            <tbody>
              {medicamentos.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 dark:border-[#1a2540] hover:bg-gray-50 dark:hover:bg-[#0f1c35] transition">
                  <td className="px-6 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{m.codigo}</td>
                  <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{m.nome}</td>
                  <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">
                    {m.nomeCliente !== m.nome ? (
                      <span className="flex items-center gap-1">
                        {m.nomeCliente}
                        <span className="text-xs text-primary-500 bg-primary-50 dark:bg-primary-900/20 px-1.5 py-0.5 rounded">reclassificado</span>
                      </span>
                    ) : m.nomeCliente}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.tipo === "INFUSAO" ? "bg-blue-100 text-blue-700" :
                      m.tipo === "EXAME" ? "bg-green-100 text-green-700" :
                      "bg-purple-100 text-purple-700"
                    }`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    {m.exigeLote
                      ? <span className="material-symbols-outlined text-amber-500 text-lg">warning</span>
                      : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-6 py-3 text-center text-gray-600 dark:text-gray-300">{m._count.pedidos}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {m.ativo ? "Sim" : "Não"}
                    </span>
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
