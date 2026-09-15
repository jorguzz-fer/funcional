/**
 * Histórico de faturamentos: filtros (ano, período, busca) e carga das linhas
 * com os agregados exibidos na lista e na exportação.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface FiltrosHistorico {
  /** Ano da data de início (YYYY). */
  ano?: string;
  /** Período de competência a localizar (YYYY-MM-DD) — faturamentos que o sobrepõem. */
  de?: string;
  ate?: string;
  /** Texto livre: programa ou observações. */
  busca?: string;
}

export interface LinhaHistorico {
  id: string;
  programa: string | null;
  dataInicio: Date;
  dataFechamento: Date;
  status: string;
  createdAt: Date;
  pedidosTotal: number;
  pedidosValidos: number;
  pedidosExcluidos: number;
  aguardandoNF: number;
  divergenciasPendentes: number;
  divergenciasResolvidas: number;
  valorAutorizador: number;
  valorProteus: number;
}

type ParamsLike = URLSearchParams | Record<string, string | string[] | undefined>;

function lerParam(sp: ParamsLike, chave: string): string | undefined {
  const v = sp instanceof URLSearchParams ? sp.get(chave) : sp[chave];
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

export function parseFiltrosHistorico(sp: ParamsLike): FiltrosHistorico {
  const ano = lerParam(sp, "ano");
  return {
    ano: ano && /^\d{4}$/.test(ano) ? ano : undefined,
    de: lerParam(sp, "de"),
    ate: lerParam(sp, "ate"),
    busca: lerParam(sp, "busca")?.slice(0, 80),
  };
}

export function temFiltro(f: FiltrosHistorico): boolean {
  return !!(f.ano || f.de || f.ate || f.busca);
}

/** YYYY-MM-DD → início (00:00 UTC) ou fim (23:59:59 UTC) do dia. */
function parseDia(s: string | undefined, fimDoDia: boolean): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = fimDoDia
    ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999))
    : new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0));
  return isNaN(d.getTime()) ? null : d;
}

export function whereHistorico(f: FiltrosHistorico): Prisma.FaturamentoWhereInput {
  const and: Prisma.FaturamentoWhereInput[] = [];

  if (f.ano) {
    const ano = Number(f.ano);
    and.push({
      dataInicio: { gte: new Date(Date.UTC(ano, 0, 1)), lt: new Date(Date.UTC(ano + 1, 0, 1)) },
    });
  }

  // Sobreposição de período: fecha depois de "de" e começa antes de "até"
  const de = parseDia(f.de, false);
  const ate = parseDia(f.ate, true);
  if (de) and.push({ dataFechamento: { gte: de } });
  if (ate) and.push({ dataInicio: { lte: ate } });

  if (f.busca) {
    and.push({
      OR: [
        { programa: { contains: f.busca, mode: "insensitive" } },
        { observacoes: { contains: f.busca, mode: "insensitive" } },
      ],
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

/** Anos (da data de início) com faturamentos registrados, mais recente primeiro. */
export async function anosDisponiveis(): Promise<number[]> {
  const datas = await prisma.faturamento.findMany({ select: { dataInicio: true } });
  const anos = new Set(datas.map((d) => d.dataInicio.getUTCFullYear()));
  return [...anos].sort((a, b) => b - a);
}

/**
 * Carrega o histórico filtrado com os agregados por faturamento em poucas
 * consultas (groupBy), independentemente do número de registros.
 */
export async function carregarHistorico(f: FiltrosHistorico): Promise<LinhaHistorico[]> {
  const faturamentos = await prisma.faturamento.findMany({
    where: whereHistorico(f),
    orderBy: [{ dataInicio: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      programa: true,
      dataInicio: true,
      dataFechamento: true,
      status: true,
      createdAt: true,
    },
  });
  if (faturamentos.length === 0) return [];

  const ids = faturamentos.map((x) => x.id);
  const emIds = { faturamentoId: { in: ids } };

  const [pedidos, ordens, conciliacoes, divergencias] = await Promise.all([
    prisma.pedido.groupBy({
      by: ["faturamentoId", "excluido"],
      where: emIds,
      _count: { _all: true },
      _sum: { valorUnitario: true },
    }),
    prisma.ordemPagamento.groupBy({
      by: ["faturamentoId"],
      where: emIds,
      _sum: { valorTotal: true },
    }),
    prisma.conciliacao.groupBy({
      by: ["faturamentoId", "status"],
      where: emIds,
      _count: { _all: true },
    }),
    prisma.divergencia.groupBy({
      by: ["faturamentoId", "resolvido"],
      where: emIds,
      _count: { _all: true },
    }),
  ]);

  const linhas = new Map<string, LinhaHistorico>(
    faturamentos.map((x) => [
      x.id,
      {
        ...x,
        pedidosTotal: 0,
        pedidosValidos: 0,
        pedidosExcluidos: 0,
        aguardandoNF: 0,
        divergenciasPendentes: 0,
        divergenciasResolvidas: 0,
        valorAutorizador: 0,
        valorProteus: 0,
      },
    ]),
  );

  for (const p of pedidos) {
    const l = linhas.get(p.faturamentoId)!;
    l.pedidosTotal += p._count._all;
    if (p.excluido) l.pedidosExcluidos += p._count._all;
    else {
      l.pedidosValidos += p._count._all;
      l.valorAutorizador += Number(p._sum.valorUnitario ?? 0);
    }
  }
  for (const o of ordens) {
    linhas.get(o.faturamentoId)!.valorProteus += Number(o._sum.valorTotal ?? 0);
  }
  for (const c of conciliacoes) {
    if (c.status === "PENDENTE") linhas.get(c.faturamentoId)!.aguardandoNF += c._count._all;
  }
  for (const d of divergencias) {
    const l = linhas.get(d.faturamentoId)!;
    if (d.resolvido) l.divergenciasResolvidas += d._count._all;
    else l.divergenciasPendentes += d._count._all;
  }

  return faturamentos.map((x) => linhas.get(x.id)!);
}

/** Query string equivalente aos filtros (para links de exportação/limpeza). */
export function queryFiltros(f: FiltrosHistorico): string {
  const p = new URLSearchParams();
  if (f.ano) p.set("ano", f.ano);
  if (f.de) p.set("de", f.de);
  if (f.ate) p.set("ate", f.ate);
  if (f.busca) p.set("busca", f.busca);
  return p.toString();
}
