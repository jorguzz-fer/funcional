import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizarCnpj, normalizarTexto } from "./utils";

/**
 * Executes the conciliation logic for a given Faturamento.
 *
 * Match strategy (as described by the Funcional team):
 *   PRIMARY   — numeroNotaFiscal (Autorizador) ↔ numeroNotaFiscal (Proteus)
 *               "a gente usa a nota fiscal de referência" — Gabi
 *   FALLBACK  — codigoOrdemPagamento (Autorizador) ↔ codigoOrdem (Proteus)
 *               used when a pedido has no NF yet.
 *
 * Pedidos are grouped by their match key so the sum of valorUnitario
 * across the group can be compared against the single OrdemPagamento.valorTotal.
 */
export async function executarConciliacao(faturamentoId: string): Promise<void> {
  // ── 1. Load data ───────────────────────────────────────────────────────────
  const pedidos = await prisma.pedido.findMany({
    where: { faturamentoId, excluido: false },
    select: {
      id: true,
      codigoOrdemPagamento: true,
      numeroNotaFiscal: true,
      valorUnitario: true,
      clinica: { select: { cnpj: true } },
    },
  });

  const ordens = await prisma.ordemPagamento.findMany({
    where: { faturamentoId },
    select: {
      id: true,
      codigoOrdem: true,
      numeroNotaFiscal: true,
      valorTotal: true,
      cnpj: true,
    },
  });

  // ── 2. Build lookup maps for OrdemPagamento ────────────────────────────────
  // PRIMARY: by normalized NF
  const ordemPorNF = new Map<string, (typeof ordens)[number]>();
  // FALLBACK: by codigoOrdem
  const ordemPorCodigo = new Map<string, (typeof ordens)[number]>();

  for (const ordem of ordens) {
    const nfKey = normalizarNF(ordem.numeroNotaFiscal);
    if (nfKey) ordemPorNF.set(nfKey, ordem);

    if (ordem.codigoOrdem) {
      ordemPorCodigo.set(ordem.codigoOrdem.trim(), ordem);
    }
  }

  // ── 3. Group Pedidos by match key ─────────────────────────────────────────
  type MatchType = "NF" | "CODIGO" | "NENHUM";
  interface Grupo {
    pedidos: (typeof pedidos)[number][];
    matchType: MatchType;
    matchKey: string;
  }

  const grupos = new Map<string, Grupo>();

  for (const pedido of pedidos) {
    const nfKey  = normalizarNF(pedido.numeroNotaFiscal);
    const codKey = pedido.codigoOrdemPagamento?.trim();

    if (nfKey) {
      const gKey = `NF:${nfKey}`;
      if (!grupos.has(gKey)) grupos.set(gKey, { pedidos: [], matchType: "NF", matchKey: nfKey });
      grupos.get(gKey)!.pedidos.push(pedido);
    } else if (codKey) {
      const gKey = `COD:${codKey}`;
      if (!grupos.has(gKey)) grupos.set(gKey, { pedidos: [], matchType: "CODIGO", matchKey: codKey });
      grupos.get(gKey)!.pedidos.push(pedido);
    } else {
      // No NF and no codigoOrdemPagamento → cannot match
      const gKey = `NENHUM:${pedido.id}`;
      grupos.set(gKey, { pedidos: [pedido], matchType: "NENHUM", matchKey: "" });
    }
  }

  // ── 4. Process each group ─────────────────────────────────────────────────
  for (const grupo of grupos.values()) {
    const { pedidos: gruPedidos, matchType, matchKey } = grupo;

    // Pedidos without any match key
    if (matchType === "NENHUM") {
      const pedido = gruPedidos[0];
      await upsertConciliacao({
        faturamentoId,
        pedidoId: pedido.id,
        ordemId: null,
        status: "ATENCAO",
        valorAutorizador: null,
        valorProteus: null,
        diferenca: null,
      });
      await criarDivergencia({
        faturamentoId,
        tipo: "LINHA_FALTANTE",
        descricao: "Pedido sem nota fiscal nem código de ordem — não foi possível conciliar",
        detalhe: { pedidoId: pedido.id },
      });
      continue;
    }

    // Find the matching OrdemPagamento
    const ordem = matchType === "NF"
      ? ordemPorNF.get(matchKey)
      : ordemPorCodigo.get(matchKey);

    const somaPedidos = gruPedidos.reduce(
      (acc, p) => acc + (p.valorUnitario ? Number(p.valorUnitario) : 0),
      0,
    );

    for (const pedido of gruPedidos) {
      if (!ordem) {
        // Ordem not found in Proteus
        const descricao = matchType === "NF"
          ? `NF "${pedido.numeroNotaFiscal}" não encontrada no Proteus`
          : `Código de ordem "${matchKey}" não encontrado no Proteus`;

        await upsertConciliacao({
          faturamentoId,
          pedidoId: pedido.id,
          ordemId: null,
          status: "ATENCAO",
          valorAutorizador: somaPedidos,
          valorProteus: null,
          diferenca: null,
        });
        await criarDivergencia({
          faturamentoId,
          tipo: "LINHA_FALTANTE",
          descricao,
          detalhe: { matchKey, matchType, pedidoId: pedido.id },
          valorAutorizador: somaPedidos,
        });
        continue;
      }

      const valorProteus = ordem.valorTotal ? Number(ordem.valorTotal) : 0;
      const diferenca    = Math.abs(somaPedidos - valorProteus);
      const divergencias: string[] = [];

      // Valor divergente (tolerance R$ 0,01)
      if (diferenca > 0.01) {
        divergencias.push("VALOR_DIVERGENTE");
        await criarDivergencia({
          faturamentoId,
          tipo: "VALOR_DIVERGENTE",
          descricao: `Valor Autorizador (${somaPedidos.toFixed(2)}) ≠ Valor Proteus (${valorProteus.toFixed(2)}) — NF "${pedido.numeroNotaFiscal ?? matchKey}"`,
          detalhe: { matchKey, matchType, pedidoId: pedido.id, ordemId: ordem.id },
          valorAutorizador: somaPedidos,
          valorProteus,
        });
      }

      // NF divergente (só checamos quando o match foi por código, para detectar divergência de NF)
      if (matchType === "CODIGO") {
        const nfAut = normalizarTexto(pedido.numeroNotaFiscal ?? "");
        const nfPro = normalizarTexto(ordem.numeroNotaFiscal ?? "");
        if (nfAut && nfPro && nfAut !== nfPro) {
          divergencias.push("NF_ABREVIADA");
          await criarDivergencia({
            faturamentoId,
            tipo: "NF_ABREVIADA",
            descricao: `NF Autorizador "${pedido.numeroNotaFiscal}" ≠ NF Proteus "${ordem.numeroNotaFiscal}"`,
            detalhe: {
              matchKey,
              pedidoId: pedido.id,
              ordemId: ordem.id,
              nfAutorizador: pedido.numeroNotaFiscal,
              nfProteus: ordem.numeroNotaFiscal,
            },
          });
        }
      }

      // CNPJ divergente
      const cnpjAut = normalizarCnpj(pedido.clinica?.cnpj ?? "");
      const cnpjPro = normalizarCnpj(ordem.cnpj ?? "");
      if (cnpjAut && cnpjPro && cnpjAut !== cnpjPro) {
        divergencias.push("CNPJ_DIFERENTE");
        await criarDivergencia({
          faturamentoId,
          tipo: "CNPJ_DIFERENTE",
          descricao: `CNPJ Autorizador "${cnpjAut}" ≠ CNPJ Proteus "${cnpjPro}"`,
          detalhe: {
            matchKey,
            pedidoId: pedido.id,
            ordemId: ordem.id,
            cnpjAutorizador: cnpjAut,
            cnpjProteus: cnpjPro,
          },
        });
      }

      await upsertConciliacao({
        faturamentoId,
        pedidoId: pedido.id,
        ordemId: ordem.id,
        status: divergencias.length > 0 ? "ATENCAO" : "OK",
        valorAutorizador: somaPedidos,
        valorProteus,
        diferenca,
      });
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalizes a nota fiscal number for comparison:
 * lowercases, trims, removes accents and underscores.
 * Returns null/empty string when the input is blank.
 */
function normalizarNF(raw: string | null | undefined): string {
  if (!raw) return "";
  const s = String(raw)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return s;
}

interface ConciliacaoData {
  faturamentoId: string;
  pedidoId: string;
  ordemId: string | null;
  status: "OK" | "ATENCAO" | "PENDENTE" | "RESOLVIDO";
  valorAutorizador: number | null;
  valorProteus: number | null;
  diferenca: number | null;
}

async function upsertConciliacao(data: ConciliacaoData) {
  await prisma.conciliacao.upsert({
    where: { pedidoId: data.pedidoId },
    create: {
      faturamentoId: data.faturamentoId,
      pedidoId:      data.pedidoId,
      ordemId:       data.ordemId,
      status:        data.status,
      valorAutorizador: data.valorAutorizador,
      valorProteus:     data.valorProteus,
      diferenca:        data.diferenca,
    },
    update: {
      ordemId:       data.ordemId,
      status:        data.status,
      valorAutorizador: data.valorAutorizador,
      valorProteus:     data.valorProteus,
      diferenca:        data.diferenca,
    },
  });
}

interface DivergenciaData {
  faturamentoId: string;
  tipo:
    | "LINHA_FALTANTE"
    | "VALOR_DIVERGENTE"
    | "NF_ABREVIADA"
    | "CNPJ_DIFERENTE"
    | "RAZAO_SOCIAL_DIFERENTE"
    | "LOTE_AUSENTE"
    | "VOUCHER_SEM_FINALIZACAO"
    | "OUTRO";
  descricao: string;
  detalhe?: Prisma.InputJsonValue;
  valorAutorizador?: number;
  valorProteus?: number;
}

async function criarDivergencia(data: DivergenciaData) {
  await prisma.divergencia.create({
    data: {
      faturamentoId: data.faturamentoId,
      tipo:          data.tipo,
      descricao:     data.descricao,
      detalhe:       (data.detalhe ?? {}) as Prisma.InputJsonValue,
      valorAutorizador: data.valorAutorizador ?? null,
      valorProteus:     data.valorProteus ?? null,
    },
  });
}
