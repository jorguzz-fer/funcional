import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import ExportButtons from "@/components/Funcional/ExportButtons";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ExportPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const faturamento = await prisma.faturamento.findUnique({
    where: { id },
    select: {
      id: true,
      dataInicio: true,
      dataFechamento: true,
      status: true,
    },
  });

  if (!faturamento) notFound();

  const fmt = (d: Date) => d.toLocaleDateString("pt-BR");
  const periodo = `${fmt(faturamento.dataInicio)} — ${fmt(faturamento.dataFechamento)}`;

  const divergenciasPendentes = await prisma.divergencia.count({
    where: { faturamentoId: id, resolvido: false },
  });

  return (
    <div className="p-[25px]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href={`/faturamento/${id}`}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Exportar Faturamento — {periodo}
        </h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 ml-8">
        Gere as planilhas prontas para envio à J&amp;J
      </p>

      {/* Divergencias warning */}
      {divergenciasPendentes > 0 && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl flex-shrink-0 mt-0.5">warning</span>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {divergenciasPendentes} divergência{divergenciasPendentes !== 1 ? "s" : ""} não resolvida{divergenciasPendentes !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Recomendamos resolver todas as divergências antes de exportar para garantir a precisão do faturamento.
            </p>
            <Link
              href={`/faturamento/${id}/divergencias`}
              className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline mt-1 inline-block"
            >
              Resolver divergências →
            </Link>
          </div>
        </div>
      )}

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Planilha Funcional */}
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-6 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">table_chart</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Planilha Funcional
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Formato para envio à J&amp;J — campos BR-A/DSP, sem dados pessoais (LGPD)
              </p>
            </div>
          </div>

          <ul className="space-y-1.5 mb-5 text-sm text-gray-600 dark:text-gray-300">
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-base">check</span>
              Voucher, medicamento, clínica (CNPJ)
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-base">check</span>
              Código paciente (BR-A/DSP) — sem PII
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-base">check</span>
              Data infusão, AGE, valor unitário
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-base">check</span>
              Somente pedidos não excluídos
            </li>
          </ul>

          <ExportButtons
            faturamentoId={id}
            tipo="funcional"
            label="Baixar Planilha Funcional (.xlsx)"
          />
        </div>

        {/* Planilha Proteus */}
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-6 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-xl">description</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Planilha Proteus
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Formato compatível com o sistema Proteus / Talita
              </p>
            </div>
          </div>

          <ul className="space-y-1.5 mb-5 text-sm text-gray-600 dark:text-gray-300">
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-base">check</span>
              Código de ordem de pagamento
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-base">check</span>
              Número de nota fiscal e datas
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-base">check</span>
              Status da ordem de pagamento
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-base">check</span>
              Valores totais por ordem
            </li>
          </ul>

          <ExportButtons
            faturamentoId={id}
            tipo="proteus"
            label="Baixar Planilha Proteus (.xlsx)"
          />
        </div>
      </div>

      {/* Info footer */}
      <div className="mt-6 p-4 rounded-xl bg-gray-50 dark:bg-[#0a1220] border border-gray-200 dark:border-[#1e2d47] flex items-start gap-3">
        <span className="material-symbols-outlined text-gray-400 text-base flex-shrink-0 mt-0.5">info</span>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Os arquivos gerados são registrados no log de auditoria. Cada download fica vinculado ao seu usuário e data/hora de exportação.
        </p>
      </div>
    </div>
  );
}
