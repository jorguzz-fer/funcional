"use client";

interface Pedido {
  id: string;
  voucher: string;
  codigoPaciente: string;
  dataInfusao: Date | null;
  ageDias: number | null;
  valorUnitario: unknown;
  statusVoucher: string | null;
  statusOrdemPagamento: string | null;
  excluido: boolean;
  motivoExclusao: string | null;
  clinica: { cnpj: string; razaoSocial: string; nomeFantasia: string | null } | null;
  medicamento: { nome: string } | null;
}

const STATUS_VOUCHER_LABEL: Record<string, string> = {
  CONSULTADO: "Consultado",
  FINALIZADO: "Finalizado",
  GLOSADO:    "Glosado",
};

const STATUS_VOUCHER_BADGE: Record<string, string> = {
  CONSULTADO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  FINALIZADO: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  GLOSADO:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const STATUS_ORDEM_LABEL: Record<string, string> = {
  AGUARDANDO_NOTA_FISCAL:     "Aguard. NF",
  NOTA_FISCAL_EM_ANALISE:     "NF em Análise",
  ENVIADA_PARA_FATURAMENTO:   "Enviada",
};

export default function PedidosTable({ pedidos }: { pedidos: Pedido[] }) {
  if (pedidos.length === 0) {
    return (
      <div className="p-12 text-center">
        <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-4xl block mb-2">
          inbox
        </span>
        <p className="text-gray-500 dark:text-gray-400">Nenhum pedido encontrado</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-[#1e2d47]">
            <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Voucher</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Clínica</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Medicamento</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Data Infusão</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-500 dark:text-gray-400">AGE</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-500 dark:text-gray-400">Valor</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Status Voucher</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Status Ordem</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((p) => (
            <tr
              key={p.id}
              className={`border-b border-gray-50 dark:border-[#1a2540] transition ${
                p.excluido
                  ? "opacity-50 bg-gray-50 dark:bg-[#0a1220]"
                  : "hover:bg-gray-50 dark:hover:bg-[#0f1c35]"
              }`}
            >
              <td className="px-4 py-3">
                <span className={`font-mono text-xs font-medium ${p.excluido ? "line-through text-gray-400" : "text-gray-900 dark:text-white"}`}>
                  {p.voucher}
                </span>
                {p.excluido && p.motivoExclusao && (
                  <span
                    className="block text-xs text-red-500 dark:text-red-400 mt-0.5"
                    title={p.motivoExclusao}
                  >
                    Excluído
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <p className="text-gray-800 dark:text-gray-200 text-xs font-medium leading-snug max-w-[180px] truncate">
                  {p.clinica?.nomeFantasia ?? p.clinica?.razaoSocial ?? "—"}
                </p>
                <p className="text-gray-400 text-xs font-mono">
                  {p.clinica?.cnpj ?? "—"}
                </p>
              </td>
              <td className="px-4 py-3">
                <span className="text-gray-700 dark:text-gray-300 text-xs max-w-[160px] truncate block">
                  {p.medicamento?.nome ?? "—"}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                {p.dataInfusao
                  ? new Date(p.dataInfusao).toLocaleDateString("pt-BR")
                  : "—"}
              </td>
              <td className="px-4 py-3 text-center">
                {p.ageDias != null ? (
                  <span
                    className={`text-xs font-semibold ${
                      p.ageDias > 60
                        ? "text-red-600 dark:text-red-400"
                        : p.ageDias > 30
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {p.ageDias}d
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right text-xs font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                {p.valorUnitario != null
                  ? Number(p.valorUnitario).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : "—"}
              </td>
              <td className="px-4 py-3 text-center">
                {p.statusVoucher ? (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_VOUCHER_BADGE[p.statusVoucher] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {STATUS_VOUCHER_LABEL[p.statusVoucher] ?? p.statusVoucher}
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                {p.statusOrdemPagamento ? (
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    {STATUS_ORDEM_LABEL[p.statusOrdemPagamento] ?? p.statusOrdemPagamento}
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
