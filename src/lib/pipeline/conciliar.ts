import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizarCnpj, normalizarTexto } from "./utils";

/**
 * Executes the conciliation logic for a given Faturamento.
 *
 * For each group of Pedidos sharing the same codigoOrdemPagamento:
 *  1. Sums valorUnitario across all pedidos in the group.
 *  2. Looks up the matching OrdemPagamento by codigoOrdem.
 *  3. Creates or updates a Conciliacao record with the appropriate status.
 *  4. Creates Divergencia records for detected discrepancies.
 */
export async function executarConciliacao(faturamentoId: string): Promise<void> {
  // 1. Fetch all non-excluded Pedidos and all OrdemPagamento for this faturamento
  const pedidos = await prisma.pedido.findMany({
    where: { faturamentoId, excluido: false },
    select: {
      id: true,
      codigoOrdemPagamento: true,
      valorUnitario: true,
      numeroNotaFiscal: true,
      clinica: {
        select: { cnpj: true },
      },
    },
  });

  const ordens = await prisma.ordemPagamento.findMany({
    where: { faturamentoId },
    select: {
      id: true,
      codigoOrdem: true,
      valorTotal: true,
      numeroNotaFiscal: true,
      cnpj: true,
    },
  });

  // Build a lookup map: codigoOrdem → OrdemPagamento
  const ordemPorCodigo = new Map<string, (typeof ordens)[number]>();
  for (const ordem of ordens) {
    if (ordem.codigoOrdem) {
      ordemPorCodigo.set(ordem.codigoOrdem.trim(), ordem);
    }
  }

  // 2. Group Pedidos by codigoOrdemPagamento
  const grupos = new Map<string, (typeof pedidos)[number][]>();
  const semOrdem: (typeof pedidos)[number][] = [];

  for (const pedido of pedidos) {
    if (!pedido.codigoOrdemPagamento) {
      semOrdem.push(pedido);
      continue;
    }
    const key = pedido.codigoOrdemPagamento.trim();
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(pedido);
  }

  // Process pedidos without a codigoOrdemPagamento → LINHA_FALTANTE divergence
  for (const pedido of semOrdem) {
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
      descricao: "Pedido sem código de ordem de pagamento",
      detalhe: { pedidoId: pedido.id },
    });
  }

  // 3. Process each grupo
  for (const [codigoOrdem, gruPedidos] of grupos.entries()) {
    // Sum valorUnitario for the group
    const somaPedidos = gruPedidos.reduce((acc, p) => {
      const val = p.valorUnitario ? Number(p.valorUnitario) : 0;
      return acc + val;
    }, 0);

    const ordem = ordemPorCodigo.get(codigoOrdem);

    for (const pedido of gruPedidos) {
      if (!ordem) {
        // Ordem not found in Proteus → LINHA_FALTANTE
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
          descricao: `Ordem de pagamento "${codigoOrdem}" não encontrada no Proteus`,
          detalhe: { codigoOrdem, pedidoId: pedido.id },
          valorAutorizador: somaPedidos,
        });

        continue;
      }

      const valorProteus = ordem.valorTotal ? Number(ordem.valorTotal) : 0;
      const diferenca = Math.abs(somaPedidos - valorProteus);
      const divergencias: string[] = [];

      // 4. Check value divergence (tolerance of R$ 0.01)
      if (diferenca > 0.01) {
        divergencias.push("VALOR_DIVERGENTE");
        await criarDivergencia({
          faturamentoId,
          tipo: "VALOR_DIVERGENTE",
          descricao: `Valor Autorizador (${somaPedidos.toFixed(2)}) ≠ Valor Proteus (${valorProteus.toFixed(2)}) para ordem ${codigoOrdem}`,
          detalhe: { codigoOrdem, pedidoId: pedido.id, ordemId: ordem.id },
          valorAutorizador: somaPedidos,
          valorProteus,
        });
      }

      // 5. Check NF divergence (after normalization)
      const nfAutorizador = normalizarTexto(pedido.numeroNotaFiscal ?? "");
      const nfProteus = normalizarTexto(ordem.numeroNotaFiscal ?? "");
      if (nfAutorizador && nfProteus && nfAutorizador !== nfProteus) {
        divergencias.push("NF_ABREVIADA");
        await criarDivergencia({
          faturamentoId,
          tipo: "NF_ABREVIADA",
          descricao: `NF Autorizador "${pedido.numeroNotaFiscal}" ≠ NF Proteus "${ordem.numeroNotaFiscal}" para ordem ${codigoOrdem}`,
          detalhe: {
            codigoOrdem,
            pedidoId: pedido.id,
            ordemId: ordem.id,
            nfAutorizador: pedido.numeroNotaFiscal,
            nfProteus: ordem.numeroNotaFiscal,
          },
        });
      }

      // 6. Check CNPJ divergence
      const cnpjAut = normalizarCnpj(pedido.clinica?.cnpj ?? "");
      const cnpjPro = normalizarCnpj(ordem.cnpj ?? "");
      if (cnpjAut && cnpjPro && cnpjAut !== cnpjPro) {
        divergencias.push("CNPJ_DIFERENTE");
        await criarDivergencia({
          faturamentoId,
          tipo: "CNPJ_DIFERENTE",
          descricao: `CNPJ Autorizador "${cnpjAut}" ≠ CNPJ Proteus "${cnpjPro}" para ordem ${codigoOrdem}`,
          detalhe: {
            codigoOrdem,
            pedidoId: pedido.id,
            ordemId: ordem.id,
            cnpjAutorizador: cnpjAut,
            cnpjProteus: cnpjPro,
          },
        });
      }

      const status = divergencias.length > 0 ? "ATENCAO" : "OK";

      await upsertConciliacao({
        faturamentoId,
        pedidoId: pedido.id,
        ordemId: ordem.id,
        status,
        valorAutorizador: somaPedidos,
        valorProteus,
        diferenca,
      });
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
      pedidoId: data.pedidoId,
      ordemId: data.ordemId,
      status: data.status,
      valorAutorizador: data.valorAutorizador,
      valorProteus: data.valorProteus,
      diferenca: data.diferenca,
    },
    update: {
      ordemId: data.ordemId,
      status: data.status,
      valorAutorizador: data.valorAutorizador,
      valorProteus: data.valorProteus,
      diferenca: data.diferenca,
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
      tipo: data.tipo,
      descricao: data.descricao,
      detalhe: (data.detalhe ?? {}) as Prisma.InputJsonValue,
      valorAutorizador: data.valorAutorizador ?? null,
      valorProteus: data.valorProteus ?? null,
    },
  });
}
