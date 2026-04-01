import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useReconciliationStore } from "../stores/reconciliationStore";
import { useUploadStore } from "../stores/uploadStore";
import { formatBRL, formatCnpj } from "../lib/utils";
import {
  CheckCircle,
  XCircle,
  Download,
  Search,
  MessageSquare,
  Loader2,
} from "lucide-react";

const TABS = [
  { key: "todos", label: "Todos" },
  { key: "consistente", label: "Consistentes" },
  { key: "divergente_valor", label: "Diverg. Valor" },
  { key: "divergente_cnpj", label: "Diverg. CNPJ" },
  { key: "divergente_razao", label: "Diverg. Razão" },
  { key: "sem_match_proteus", label: "Sem Match Pro." },
  { key: "sem_match_autorizador", label: "Sem Match Aut." },
];

export function ReconciliationPage() {
  const [searchParams] = useSearchParams();
  const batchIdParam = searchParams.get("batchId");

  const { batches, fetchBatches } = useUploadStore();
  const {
    results,
    pagination,
    isLoading,
    activeTab,
    setActiveTab,
    fetchResults,
    fetchSummary,
    summary,
    resolveItem,
  } = useReconciliationStore();

  const [selectedBatchId, setSelectedBatchId] = useState(batchIdParam || "");
  const [resolveModal, setResolveModal] = useState<string | null>(null);
  const [obs, setObs] = useState("");

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useEffect(() => {
    if (batchIdParam) {
      setSelectedBatchId(batchIdParam);
    } else if (batches.length > 0 && !selectedBatchId) {
      const conciliado = batches.find((b) => b.status === "conciliado");
      if (conciliado) setSelectedBatchId(conciliado.id);
    }
  }, [batches, batchIdParam, selectedBatchId]);

  useEffect(() => {
    if (selectedBatchId) {
      fetchResults(selectedBatchId, activeTab);
      fetchSummary(selectedBatchId);
    }
  }, [selectedBatchId, activeTab, fetchResults, fetchSummary]);

  const handleResolve = async () => {
    if (resolveModal) {
      await resolveItem(resolveModal, obs);
      setResolveModal(null);
      setObs("");
    }
  };

  const handleExport = (type: "externos" | "divergencias") => {
    const token = localStorage.getItem("token");
    window.open(
      `/api/export/${selectedBatchId}/${type}?token=${token}`,
      "_blank"
    );
  };

  return (
    <div className="space-y-[25px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-black">Conciliação</h1>
          <p className="text-gray-400 text-[13px] mt-[4px]">
            Bate financeiro Autorizador × Proteus
          </p>
        </div>

        <div className="flex items-center gap-[12px]">
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="h-[40px] rounded-md text-black border border-gray-200 bg-white px-[14px] text-[13px] outline-0 transition-all focus:border-primary-500"
          >
            <option value="">Selecione o período</option>
            {batches
              .filter((b) => b.status === "conciliado")
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.periodo}
                </option>
              ))}
          </select>

          <button
            onClick={() => handleExport("externos")}
            disabled={!selectedBatchId}
            className="inline-flex items-center gap-[6px] transition-all rounded-md font-medium px-[13px] py-[6px] text-white bg-success-600 hover:bg-success-700 disabled:opacity-50 text-[13px]"
          >
            <Download size={14} />
            Exportar J&J
          </button>

          <button
            onClick={() => handleExport("divergencias")}
            disabled={!selectedBatchId}
            className="inline-flex items-center gap-[6px] transition-all rounded-md font-medium px-[13px] py-[6px] text-white bg-danger-500 hover:bg-danger-600 disabled:opacity-50 text-[13px]"
          >
            <Download size={14} />
            Divergências
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="trezo-card !p-0">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map((tab) => {
            const count =
              tab.key === "todos"
                ? Object.values(summary?.statusCounts || {}).reduce(
                    (a, b) => a + b,
                    0
                  )
                : summary?.statusCounts?.[tab.key] || 0;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-[20px] py-[13px] text-[13px] font-medium whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.key
                    ? "border-primary-500 text-primary-500"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`ml-[6px] text-[11px] px-[6px] py-[1px] rounded-full ${
                      activeTab === tab.key
                        ? "bg-primary-50 text-primary-500"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="trezo-card-content">
          {isLoading ? (
            <div className="flex items-center justify-center py-[60px]">
              <Loader2 className="animate-spin text-gray-300" size={32} />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-[60px] text-gray-400">
              <Search size={48} className="mx-auto mb-[12px] opacity-50" />
              <p className="text-[14px]">Nenhum resultado encontrado</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="text-black">
                <tr>
                  {[
                    "NF",
                    "Voucher",
                    "Status",
                    "Valor Aut.",
                    "Valor Pro.",
                    "Valor",
                    "CNPJ Aut.",
                    "CNPJ Pro.",
                    "CNPJ",
                    "Razão",
                    "Ações",
                  ].map((h) => (
                    <th
                      key={h}
                      className="font-medium text-left px-[20px] py-[11px] bg-primary-50 whitespace-nowrap text-[13px] first:pl-[25px]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-black">
                {results.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="text-left whitespace-nowrap px-[20px] py-[17px] first:pl-[25px] border-b border-gray-100 font-mono text-[12px]">
                      {r.numNotaFiscal || "-"}
                    </td>
                    <td className="text-left whitespace-nowrap px-[20px] py-[17px] border-b border-gray-100 font-mono text-[12px]">
                      {r.voucher || "-"}
                    </td>
                    <td className="text-left whitespace-nowrap px-[20px] py-[17px] border-b border-gray-100">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="text-left whitespace-nowrap px-[20px] py-[17px] border-b border-gray-100 font-mono text-[12px]">
                      {r.valorAutorizador
                        ? formatBRL(Number(r.valorAutorizador))
                        : "-"}
                    </td>
                    <td className="text-left whitespace-nowrap px-[20px] py-[17px] border-b border-gray-100 font-mono text-[12px]">
                      {r.valorProteus
                        ? formatBRL(Number(r.valorProteus))
                        : "-"}
                    </td>
                    <td className="text-center whitespace-nowrap px-[20px] py-[17px] border-b border-gray-100">
                      <BateIcon value={r.bateValor} />
                    </td>
                    <td className="text-left whitespace-nowrap px-[20px] py-[17px] border-b border-gray-100 font-mono text-[12px]">
                      {r.cnpjAutorizador
                        ? formatCnpj(r.cnpjAutorizador)
                        : "-"}
                    </td>
                    <td className="text-left whitespace-nowrap px-[20px] py-[17px] border-b border-gray-100 font-mono text-[12px]">
                      {r.cnpjProteus ? formatCnpj(r.cnpjProteus) : "-"}
                    </td>
                    <td className="text-center whitespace-nowrap px-[20px] py-[17px] border-b border-gray-100">
                      <BateIcon value={r.bateCnpj} />
                    </td>
                    <td className="text-center whitespace-nowrap px-[20px] py-[17px] border-b border-gray-100">
                      <BateIcon value={r.bateRazao} />
                    </td>
                    <td className="text-center whitespace-nowrap px-[20px] py-[17px] border-b border-gray-100">
                      {r.status !== "consistente" &&
                        r.status !== "resolvido" && (
                          <button
                            onClick={() => setResolveModal(r.id)}
                            className="text-gray-400 hover:text-primary-500 transition-colors"
                            title="Resolver"
                          >
                            <MessageSquare size={16} />
                          </button>
                        )}
                      {r.observacao && (
                        <span
                          className="text-[11px] text-gray-400 ml-[6px]"
                          title={r.observacao}
                        >
                          💬
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-[25px] py-[15px] border-t border-gray-100">
            <p className="text-[13px] text-gray-400">
              Mostrando {results.length} de {pagination.total} resultados
            </p>
            <div className="flex gap-[4px]">
              {Array.from(
                { length: Math.min(pagination.totalPages, 10) },
                (_, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      fetchResults(selectedBatchId, activeTab, i + 1)
                    }
                    className={`px-[10px] py-[5px] text-[13px] rounded-md transition-all ${
                      pagination.page === i + 1
                        ? "bg-primary-500 text-white"
                        : "bg-white border border-gray-200 hover:bg-gray-50 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-gray-500/75 flex items-center justify-center z-50">
          <div className="bg-white rounded-md shadow-xl w-full max-w-[550px]">
            <div className="trezo-card-header bg-gray-50 px-[25px] py-[15px] rounded-t-md">
              <h5 className="text-[16px] font-semibold text-black">
                Resolver divergência
              </h5>
              <button
                onClick={() => {
                  setResolveModal(null);
                  setObs("");
                }}
                className="text-gray-400 hover:text-black text-[20px]"
              >
                ×
              </button>
            </div>
            <div className="p-[25px]">
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Adicione uma observação sobre a resolução..."
                className="w-full border border-gray-200 rounded-md px-[17px] py-[12px] text-[13px] h-[120px] resize-none outline-0 transition-all focus:border-primary-500 placeholder:text-gray-400"
              />
              <div className="flex justify-end gap-[12px] mt-[20px]">
                <button
                  onClick={() => {
                    setResolveModal(null);
                    setObs("");
                  }}
                  className="px-[17px] py-[8px] text-[13px] text-gray-500 hover:text-black transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleResolve}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-[17px] py-[8px] rounded-md text-[13px] font-medium transition-all"
                >
                  Resolver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    consistente: "bg-success-50 text-success-600",
    divergente_valor: "bg-danger-50 text-danger-600",
    divergente_cnpj: "bg-[#fff3e0] text-orange-700",
    divergente_razao: "bg-[#fffde7] text-[#f9a825]",
    sem_match_proteus: "bg-primary-50 text-primary-500",
    sem_match_autorizador: "bg-secondary-50 text-secondary-600",
    resolvido: "bg-[#e0f7fa] text-[#00838f]",
  };

  const labels: Record<string, string> = {
    consistente: "Consistente",
    divergente_valor: "Diverg. Valor",
    divergente_cnpj: "Diverg. CNPJ",
    divergente_razao: "Diverg. Razão",
    sem_match_proteus: "Sem match Pro.",
    sem_match_autorizador: "Sem match Aut.",
    resolvido: "Resolvido",
  };

  return (
    <span
      className={`px-[8px] py-[3px] inline-block rounded-sm font-medium text-[12px] ${styles[status] || "bg-gray-100 text-gray-500"}`}
    >
      {labels[status] || status}
    </span>
  );
}

function BateIcon({ value }: { value: boolean | null }) {
  if (value === null || value === undefined)
    return <span className="text-gray-300">—</span>;
  return value ? (
    <CheckCircle className="inline text-success-500" size={16} />
  ) : (
    <XCircle className="inline text-danger-500" size={16} />
  );
}
