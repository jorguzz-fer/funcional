import { useEffect, useState } from "react";
import { useUploadStore } from "../stores/uploadStore";
import { useReconciliationStore } from "../stores/reconciliationStore";
import { formatBRL } from "../lib/utils";
import {
  FileCheck,
  FileWarning,
  FileX,
  DollarSign,
  Clock,
  AlertTriangle,
  Upload,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  consistente: "#37d80a",
  divergente_valor: "#ff4023",
  divergente_cnpj: "#fd5812",
  divergente_razao: "#ffc107",
  sem_match_proteus: "#605dff",
  sem_match_autorizador: "#3584fc",
  resolvido: "#00c1eb",
};

const STATUS_LABELS: Record<string, string> = {
  consistente: "Consistentes",
  divergente_valor: "Diverg. Valor",
  divergente_cnpj: "Diverg. CNPJ",
  divergente_razao: "Diverg. Razão",
  sem_match_proteus: "Sem match Proteus",
  sem_match_autorizador: "Sem match Autorizador",
  resolvido: "Resolvidos",
};

export function DashboardPage() {
  const { batches, fetchBatches } = useUploadStore();
  const { summary, fetchSummary } = useReconciliationStore();
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useEffect(() => {
    if (batches.length > 0 && !selectedBatchId) {
      const latest = batches[0];
      if (latest) {
        setSelectedBatchId(latest.id);
        fetchSummary(latest.id);
      }
    }
  }, [batches, selectedBatchId, fetchSummary]);

  const batch = summary?.batch;
  const statusData = summary?.statusCounts
    ? Object.entries(summary.statusCounts).map(([key, value]) => ({
        name: STATUS_LABELS[key] || key,
        value,
        fill: STATUS_COLORS[key] || "#8695aa",
      }))
    : [];

  const topClinicas = summary?.topClinicas || [];

  const totalDivergentes = Object.entries(summary?.statusCounts || {})
    .filter(([k]) => k.startsWith("divergente"))
    .reduce((sum, [, v]) => sum + v, 0);

  return (
    <div className="space-y-[25px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-black">Dashboard</h1>
          <p className="text-gray-400 text-[13px] mt-[4px]">
            Visão geral do faturamento
            {batch?.periodo && ` — ${batch.periodo}`}
          </p>
        </div>

        {batches.length > 0 && (
          <select
            value={selectedBatchId || ""}
            onChange={(e) => {
              setSelectedBatchId(e.target.value);
              fetchSummary(e.target.value);
            }}
            className="h-[40px] rounded-md text-black border border-gray-200 bg-white px-[14px] text-[13px] outline-0 transition-all focus:border-primary-500"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.periodo} — {b.status}
              </option>
            ))}
          </select>
        )}
      </div>

      {!batch ? (
        <div className="trezo-card text-center py-[60px]">
          <Upload className="mx-auto text-gray-300 mb-[16px]" size={48} />
          <h2 className="text-[18px] font-medium text-gray-500">
            Nenhum faturamento processado
          </h2>
          <p className="text-gray-400 text-[13px] mt-[6px]">
            Faça o upload das planilhas para começar
          </p>
        </div>
      ) : (
        <>
          {/* Stats Cards - Row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[25px]">
            <StatCard
              icon={<FileCheck size={22} />}
              iconBg="bg-success-50 text-success-600"
              label="Trabalhada"
              value={batch.totalTrabalhada?.toLocaleString("pt-BR") || "0"}
              subtext={`de ${batch.totalRegistrosOriginal?.toLocaleString("pt-BR") || "0"} original`}
              trend="up"
            />
            <StatCard
              icon={<DollarSign size={22} />}
              iconBg="bg-primary-50 text-primary-500"
              label="Valor a Faturar"
              value={formatBRL(Number(batch.valorTotalFaturar) || 0)}
              subtext="total do período"
              trend="up"
            />
            <StatCard
              icon={<FileWarning size={22} />}
              iconBg="bg-[#fff3e0] text-orange-500"
              label="Sem NF (Vazias)"
              value={batch.totalVazias?.toLocaleString("pt-BR") || "0"}
              subtext="aguardando NF"
              trend="down"
            />
            <StatCard
              icon={<Clock size={22} />}
              iconBg="bg-danger-50 text-danger-500"
              label="Fora do Aging"
              value={batch.totalForaAging?.toLocaleString("pt-BR") || "0"}
              subtext="acima de 90 dias"
              trend="down"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[25px]">
            {/* Pie chart */}
            {statusData.length > 0 && (
              <div className="trezo-card">
                <div className="trezo-card-header">
                  <h5 className="text-[16px] font-semibold text-black">
                    Status da Conciliação
                  </h5>
                </div>
                <div className="trezo-card-content">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Bar chart */}
            {topClinicas.length > 0 && (
              <div className="trezo-card">
                <div className="trezo-card-header">
                  <h5 className="text-[16px] font-semibold text-black">
                    Top 10 Clínicas com Divergências
                  </h5>
                </div>
                <div className="trezo-card-content">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={topClinicas.map((c) => ({
                        nome:
                          c.nome.length > 25
                            ? c.nome.slice(0, 25) + "…"
                            : c.nome,
                        count: c.count,
                      }))}
                      layout="vertical"
                      margin={{ left: 150 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f6f7f9" />
                      <XAxis type="number" />
                      <YAxis
                        type="category"
                        dataKey="nome"
                        width={140}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="#ff4023"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Stats Cards - Row 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[25px]">
            <StatCard
              icon={<FileX size={22} />}
              iconBg="bg-gray-100 text-gray-500"
              label="Original"
              value={
                batch.totalRegistrosOriginal?.toLocaleString("pt-BR") || "0"
              }
              subtext="total extraído"
            />
            <StatCard
              icon={<AlertTriangle size={22} />}
              iconBg="bg-[#fff3e0] text-orange-500"
              label="Excluídas"
              value={batch.totalExcluidas?.toLocaleString("pt-BR") || "0"}
              subtext="glosadas/canceladas"
            />
            <StatCard
              icon={<FileCheck size={22} />}
              iconBg="bg-success-50 text-success-600"
              label="Consistentes"
              value={String(summary?.statusCounts?.consistente || 0)}
              subtext="bate perfeito"
              trend="up"
            />
            <StatCard
              icon={<FileWarning size={22} />}
              iconBg="bg-danger-50 text-danger-500"
              label="Divergentes"
              value={String(totalDivergentes)}
              subtext="requer atenção"
              trend="down"
            />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  subtext,
  trend,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  subtext?: string;
  trend?: "up" | "down";
}) {
  return (
    <div className="trezo-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide">
            {label}
          </p>
          <h4 className="text-[22px] font-bold text-black mt-[8px]">{value}</h4>
          {subtext && (
            <div className="flex items-center gap-[5px] mt-[6px]">
              {trend === "up" && (
                <TrendingUp size={13} className="text-success-600" />
              )}
              {trend === "down" && (
                <TrendingDown size={13} className="text-danger-500" />
              )}
              <span className="text-[12px] text-gray-400">{subtext}</span>
            </div>
          )}
        </div>
        <div
          className={`w-[48px] h-[48px] rounded-full flex items-center justify-center ${iconBg}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
