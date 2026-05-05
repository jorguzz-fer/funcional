import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import DivergenciaCard from "@/components/Funcional/DivergenciaCard";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const TIPO_LABEL: Record<string, string> = {
  LINHA_FALTANTE:          "Linha Faltante",
  VALOR_DIVERGENTE:        "Valor Divergente",
  NF_ABREVIADA:            "NF com Número Abreviado",
  CNPJ_DIFERENTE:          "CNPJ Divergente",
  RAZAO_SOCIAL_DIFERENTE:  "Razão Social Divergente",
  LOTE_AUSENTE:            "Lote Ausente",
  VOUCHER_SEM_FINALIZACAO: "Voucher Não Finalizado",
  OUTRO:                   "Outro",
};

const TIPOS = Object.keys(TIPO_LABEL);

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string; status?: string }>;
}

export default async function DivergenciasPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;

  const faturamento = await prisma.faturamento.findUnique({
    where: { id },
    select: { id: true, mesReferencia: true, anoReferencia: true, status: true },
  });

  if (!faturamento) notFound();

  const periodo = `${MESES[faturamento.mesReferencia - 1]} ${faturamento.anoReferencia}`;

  // Build filter
  const where: Parameters<typeof prisma.divergencia.findMany>[0]["where"] = {
    faturamentoId: id,
  };
  if (sp.tipo && sp.tipo !== "todos" && TIPOS.includes(sp.tipo)) {
    where.tipo = sp.tipo as "LINHA_FALTANTE" | "VALOR_DIVERGENTE" | "NF_ABREVIADA" | "CNPJ_DIFERENTE" | "RAZAO_SOCIAL_DIFERENTE" | "LOTE_AUSENTE" | "VOUCHER_SEM_FINALIZACAO" | "OUTRO";
  }
  if (sp.status === "pendente") where.resolvido = false;
  else if (sp.status === "resolvido") where.resolvido = true;

  const [divergencias, totalDivergencias, totalResolvidas, totalPendentes] = await Promise.all([
    prisma.divergencia.findMany({
      where,
      orderBy: [{ resolvido: "asc" }, { createdAt: "desc" }],
    }),
    prisma.divergencia.count({ where: { faturamentoId: id } }),
    prisma.divergencia.count({ where: { faturamentoId: id, resolvido: true } }),
    prisma.divergencia.count({ where: { faturamentoId: id, resolvido: false } }),
  ]);

  const buildFilterUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams({
      ...(sp.tipo ? { tipo: sp.tipo } : {}),
      ...(sp.status ? { status: sp.status } : {}),
      ...overrides,
    });
    return `/faturamento/${id}/divergencias?${p.toString()}`;
  };

  return (
    <div className="p-[25px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href={`/faturamento/${id}`}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Divergências — {periodo}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-8">
            Analise e resolva as discrepâncias encontradas na conciliação
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalDivergencias}</p>
        </div>
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Resolvidas</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{totalResolvidas}</p>
        </div>
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pendentes</p>
          <p className={`text-3xl font-bold ${totalPendentes > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
            {totalPendentes}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-4 border border-gray-100 dark:border-[#1e2d47] shadow-sm mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Filtrar:</span>

          {/* Tipo filter */}
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildFilterUrl({ tipo: "todos" })}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                !sp.tipo || sp.tipo === "todos"
                  ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Todos os tipos
            </Link>
            {TIPOS.map((tipo) => (
              <Link
                key={tipo}
                href={buildFilterUrl({ tipo })}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                  sp.tipo === tipo
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {TIPO_LABEL[tipo]}
              </Link>
            ))}
          </div>

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

          {/* Status filter */}
          <div className="flex gap-2">
            <Link
              href={buildFilterUrl({ status: "todos" })}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                !sp.status || sp.status === "todos"
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Todos
            </Link>
            <Link
              href={buildFilterUrl({ status: "pendente" })}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                sp.status === "pendente"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Pendente
            </Link>
            <Link
              href={buildFilterUrl({ status: "resolvido" })}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                sp.status === "resolvido"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Resolvido
            </Link>
          </div>
        </div>
      </div>

      {/* Divergencias List */}
      {divergencias.length === 0 ? (
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-12 text-center border border-gray-100 dark:border-[#1e2d47]">
          <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-5xl block mb-3">
            check_circle
          </span>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {sp.tipo || sp.status
              ? "Nenhuma divergência com esses filtros"
              : "Nenhuma divergência encontrada"}
          </p>
          {(sp.tipo || sp.status) && (
            <Link
              href={`/faturamento/${id}/divergencias`}
              className="text-primary-500 hover:underline text-sm mt-2 inline-block"
            >
              Limpar filtros
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {divergencias.map((div) => (
            <DivergenciaCard
              key={div.id}
              divergencia={{
                id: div.id,
                tipo: div.tipo,
                descricao: div.descricao,
                detalhe: div.detalhe as Record<string, unknown> | null,
                valorAutorizador: div.valorAutorizador ? Number(div.valorAutorizador) : null,
                valorProteus: div.valorProteus ? Number(div.valorProteus) : null,
                resolvido: div.resolvido,
                resolvidoPor: div.resolvidoPor,
                resolvidoEm: div.resolvidoEm?.toISOString() ?? null,
                notasResolucao: div.notasResolucao,
                createdAt: div.createdAt.toISOString(),
              }}
              faturamentoId={id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
