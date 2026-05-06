import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function ClinicasPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const clinicas = await prisma.clinica.findMany({
    orderBy: { razaoSocial: "asc" },
    include: {
      _count: {
        select: { pedidos: { where: { excluido: false } } },
      },
    },
  });

  return (
    <div className="p-[25px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clínicas</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Clínicas credenciadas cadastradas no sistema
        </p>
      </div>

      {clinicas.length === 0 ? (
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-12 text-center border border-gray-100 dark:border-[#1e2d47]">
          <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-5xl block mb-3">local_hospital</span>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma clínica cadastrada</p>
          <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
            As clínicas são registradas automaticamente quando o CNPJ do Autorizador é reconhecido no sistema. Importe a tabela de clínicas credenciadas para habilitar a conciliação por clínica.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total de Clínicas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{clinicas.length}</p>
            </div>
            <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ativas</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {clinicas.filter((c) => c.ativa).length}
              </p>
            </div>
            <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Grandes Redes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {clinicas.filter((c) => c.grandeRede).length}
              </p>
            </div>
            <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total de Pedidos Válidos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {clinicas.reduce((a, c) => a + c._count.pedidos, 0)}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-gray-100 dark:border-[#1e2d47] shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-[#1e2d47]">
                  <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">Clínica</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">CNPJ</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">Localização</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-600 dark:text-gray-400">Prazo (dias)</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-600 dark:text-gray-400">Pedidos</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-600 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {clinicas.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 dark:border-[#1a2540] hover:bg-gray-50 dark:hover:bg-[#0f1c35] transition">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{c.nomeFantasia ?? c.razaoSocial}</p>
                      {c.nomeFantasia && (
                        <p className="text-xs text-gray-400">{c.razaoSocial}</p>
                      )}
                      {c.grandeRede && (
                        <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">Grande Rede</span>
                      )}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{c.cnpj}</td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300 text-xs">
                      {c.cidade && c.estado ? `${c.cidade}, ${c.estado}` : c.cidade ?? c.estado ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-center text-gray-600 dark:text-gray-300">{c.prazoFaturamento}d</td>
                    <td className="px-6 py-3 text-center text-gray-600 dark:text-gray-300">{c._count.pedidos}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.ativa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {c.ativa ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
