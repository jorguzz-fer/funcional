import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ROLES_WRITE, type Role } from "@/lib/authz";
import Link from "next/link";
import DeleteFaturamentoButton from "@/components/Funcional/DeleteFaturamentoButton";
import {
  anosDisponiveis,
  carregarHistorico,
  parseFiltrosHistorico,
  queryFiltros,
  temFiltro,
} from "@/lib/faturamento/historico";

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

function formatCriadoEm(d: Date): string {
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  searchParams: Promise<{ ano?: string; de?: string; ate?: string; busca?: string }>;
}

export default async function FaturamentoListPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  // Quem pode criar faturamentos também pode excluí-los (fica na auditoria)
  const role = (session.user as { role?: string }).role as Role | undefined;
  const podeExcluir = !!role && ROLES_WRITE.includes(role);

  const sp = await searchParams;
  const filtros = parseFiltrosHistorico(sp);
  const filtrando = temFiltro(filtros);
  const query = queryFiltros(filtros);

  const [faturamentos, anos] = await Promise.all([carregarHistorico(filtros), anosDisponiveis()]);

  const inputClass =
    "text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a3a5c] bg-white dark:bg-[#0a1220] text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400";

  return (
    <div className="p-[25px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Faturamento</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Histórico de fechamentos J&amp;J
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/api/faturamento/historico${query ? `?${query}` : ""}`}
            title="Baixa o histórico (com os filtros aplicados) em planilha"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-[#2a3a5c] rounded-lg hover:bg-gray-50 dark:hover:bg-[#0f1c35] transition"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Exportar histórico
          </a>
          <Link
            href="/faturamento/novo"
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Novo Faturamento
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm mb-6">
        <form className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano</label>
            <select name="ano" defaultValue={filtros.ano ?? ""} className={inputClass}>
              <option value="">Todos</option>
              {anos.map((a) => (
                <option key={a} value={String(a)}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Período de</label>
            <input type="date" name="de" defaultValue={filtros.de ?? ""} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">até</label>
            <input type="date" name="ate" defaultValue={filtros.ate ?? ""} className={inputClass} />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Programa</label>
            <input
              name="busca"
              defaultValue={filtros.busca ?? ""}
              placeholder="PSP, DSP, Remi Card…"
              className={`${inputClass} w-full`}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition font-medium"
          >
            Filtrar
          </button>
          {filtrando && (
            <Link
              href="/faturamento"
              className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg border border-gray-200 dark:border-[#2a3a5c] transition"
            >
              Limpar
            </Link>
          )}
          <p className="text-xs text-gray-400 whitespace-nowrap ml-auto self-center">
            {faturamentos.length} faturamento{faturamentos.length !== 1 ? "s" : ""}
          </p>
        </form>
      </div>

      {faturamentos.length === 0 ? (
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-12 text-center border border-gray-100 dark:border-[#1e2d47]">
          <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-5xl block mb-3">
            receipt_long
          </span>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {filtrando ? "Nenhum faturamento com esses filtros" : "Nenhum faturamento ainda"}
          </p>
          {filtrando ? (
            <Link href="/faturamento" className="text-primary-500 hover:underline text-sm mt-2 inline-block">
              Limpar filtros
            </Link>
          ) : (
            <>
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
            </>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-gray-100 dark:border-[#1e2d47] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-[#1e2d47]">
                  <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">Período</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">Programa</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">Criado em</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-600 dark:text-gray-400">Status</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-600 dark:text-gray-400">Pedidos</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-600 dark:text-gray-400">Divergências</th>
                  <th className="px-6 py-4 text-right font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">Valor Proteus</th>
                  <th className="px-6 py-4 text-right font-semibold text-gray-600 dark:text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {faturamentos.map((fat) => {
                  const periodo = formatPeriodo(fat.dataInicio, fat.dataFechamento);
                  return (
                    <tr
                      key={fat.id}
                      className="border-b border-gray-50 dark:border-[#1a2540] hover:bg-gray-50 dark:hover:bg-[#0f1c35] transition"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {periodo}
                      </td>
                      <td className="px-6 py-4">
                        {fat.programa ? (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                            {fat.programa}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatCriadoEm(fat.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[fat.status] ?? ""}`}>
                          {STATUS_LABEL[fat.status] ?? fat.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-300" title={`${fat.pedidosValidos} válidos de ${fat.pedidosTotal}`}>
                        {fat.pedidosValidos}
                        {fat.pedidosExcluidos > 0 && (
                          <span className="text-gray-400 text-xs"> / {fat.pedidosTotal}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={fat.divergenciasPendentes > 0 ? "text-red-600 dark:text-red-400 font-semibold" : "text-green-600 dark:text-green-400"}>
                          {fat.divergenciasPendentes > 0 ? `⚠ ${fat.divergenciasPendentes}` : "✓ 0"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        {fat.valorProteus > 0 ? fmtBRL(fat.valorProteus) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Link
                            href={`/faturamento/${fat.id}`}
                            className="text-primary-500 hover:underline font-medium whitespace-nowrap"
                          >
                            Abrir →
                          </Link>
                          {podeExcluir && (
                            <DeleteFaturamentoButton id={fat.id} periodo={`${fat.programa ? `${fat.programa} ` : ""}${periodo}`} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
