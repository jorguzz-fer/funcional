import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUploadStore } from "../stores/uploadStore";
import { formatBRL, formatDate } from "../lib/utils";
import { Calendar, ArrowRight } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  aguardando_upload: {
    label: "Aguardando Upload",
    color: "bg-gray-100 text-gray-500",
  },
  processando: {
    label: "Processando",
    color: "bg-secondary-50 text-secondary-600",
  },
  aguardando_proteus: {
    label: "Aguardando Proteus",
    color: "bg-[#fff3e0] text-orange-700",
  },
  curadoria_completa: {
    label: "Curadoria Completa",
    color: "bg-primary-50 text-primary-500",
  },
  conciliado: {
    label: "Conciliado",
    color: "bg-success-50 text-success-600",
  },
  exportado: {
    label: "Exportado",
    color: "bg-[#e0f7fa] text-[#00838f]",
  },
};

export function HistoryPage() {
  const { batches, fetchBatches, isLoading } = useUploadStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  return (
    <div className="space-y-[25px]">
      <div>
        <h1 className="text-[24px] font-bold text-black">Histórico</h1>
        <p className="text-gray-400 text-[13px] mt-[4px]">
          Faturamentos processados anteriormente
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-[60px] text-gray-400">
          Carregando...
        </div>
      ) : batches.length === 0 ? (
        <div className="trezo-card text-center py-[60px]">
          <Calendar className="mx-auto text-gray-300 mb-[16px]" size={48} />
          <p className="text-gray-400 text-[14px]">
            Nenhum faturamento processado ainda
          </p>
        </div>
      ) : (
        <div className="space-y-[12px]">
          {batches.map((batch) => {
            const statusInfo = STATUS_MAP[batch.status] || {
              label: batch.status,
              color: "bg-gray-100 text-gray-500",
            };

            return (
              <div
                key={batch.id}
                className="trezo-card hover:shadow-md transition-all cursor-pointer"
                onClick={() => {
                  if (batch.status === "conciliado") {
                    navigate(`/reconciliation?batchId=${batch.id}`);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[15px]">
                    <div className="w-[48px] h-[48px] bg-primary-50 rounded-md flex items-center justify-center">
                      <Calendar className="text-primary-500" size={20} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-black">
                        Período {batch.periodo}
                      </h3>
                      <p className="text-[12px] text-gray-400 mt-[2px]">
                        Criado em {formatDate(batch.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-[25px]">
                    <div className="text-right">
                      <p className="text-[11px] text-gray-400">Trabalhada</p>
                      <p className="text-[14px] font-bold text-black">
                        {batch.totalTrabalhada?.toLocaleString("pt-BR") || "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-gray-400">Valor</p>
                      <p className="text-[14px] font-bold text-black">
                        {batch.valorTotalFaturar
                          ? formatBRL(Number(batch.valorTotalFaturar))
                          : "-"}
                      </p>
                    </div>
                    <span
                      className={`px-[8px] py-[3px] rounded-sm font-medium text-[12px] ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                    {batch.status === "conciliado" && (
                      <ArrowRight className="text-gray-300" size={16} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
