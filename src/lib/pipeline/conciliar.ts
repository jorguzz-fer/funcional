import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { chaveEmissor, formatarBRL, normalizarCnpj, normalizarNF } from "./utils";

/**
 * Executes the conciliation logic for a given Faturamento.
 *
 * Identidade de uma nota fiscal = NÚMERO DA NF + EMISSOR (raiz do CNPJ).
 * Parceiros diferentes emitem notas com o mesmo número, então o número
 * sozinho não identifica a nota; matriz e filiais compartilham a raiz do CNPJ
 * e são tratadas como o mesmo emissor. Quando um dos lados não informa CNPJ,
 * a nota é casada só pelo número (se ele for único no Proteus).
 *
 * Agrupamento (ambos os lados) antes de qualquer comparação:
 *   - Autorizador: pedidos da mesma NF/emissor → soma de valorUnitario.
 *   - Proteus: linhas da mesma NF/emissor → soma de valorTotal.
 * A comparação é feita GRUPO contra GRUPO e gera UMA divergência por nota
 * (nunca uma por pedido), listando os pedidos pelo identificador que a
 * operação reconhece (Pedido ID, ou o voucher na falta dele).
 *
 * Match strategy (as described by the Funcional team):
 *   PRIMARY   — numeroNotaFiscal (Autorizador) ↔ numeroNotaFiscal (Proteus)
 *               "a gente usa a nota fiscal de referência" — Gabi
 *   FALLBACK  — codigoOrdemPagamento (Autorizador) ↔ codigoOrdem (Proteus)
 *               tried when a pedido has no NF yet, ONLY as a bonus: the
 *               ordem de pagamento belongs to the Autorizador and the
 *               Proteus base normally does not carry that code. So a pedido
 *               whose OP is not found in the Proteus is NOT a divergence —
 *               its conciliação stays PENDENTE (aguardando NF) until the
 *               nota fiscal is issued and shows up in the Proteus.
 */
export async function executarConciliacao(faturamentoId: string): Promise<void> {
  // ── 1. Load data ───────────────────────────────────────────────────────────
  const pedidos = await prisma.pedido.findMany({
    where: { faturamentoId, excluido: false },
    select: {
      id: true,
      voucher: true,
      codigoPedido: true,
      codigoOrdemPagamento: true,
      numeroNotaFiscal: true,
      valorUnitario: true,
      cnpjClinica: true,
      nomeClinica: true,
      clinica: { select: { cnpj: true, razaoSocial: true, nomeFantasia: true } },
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
      razaoSocial: true,
    },
  });

  type Pedido = (typeof pedidos)[number];
  type Ordem = (typeof ordens)[number];

  // ── 2. Proteus: agrupa linhas por NF + emissor (e por código), somando ────
  interface GrupoOrdem {
    chaveNF: string;
    emissor: string;
    cnpj: string | null;
    razaoSocial: string | null;
    ordens: Ordem[];
    valorTotal: number;
  }

  const gruposPorNF = new Map<string, GrupoOrdem[]>(); // chaveNF → um grupo por emissor
  const gruposPorCodigo = new Map<string, GrupoOrdem>();

  for (const ordem of ordens) {
    const chaveNF = normalizarNF(ordem.numeroNotaFiscal);
    const emissor = chaveEmissor(ordem.cnpj);

    if (chaveNF) {
      const lista = gruposPorNF.get(chaveNF) ?? [];
      let grupo = lista.find((g) => g.emissor === emissor);
      if (!grupo) {
        grupo = { chaveNF, emissor, cnpj: ordem.cnpj, razaoSocial: ordem.razaoSocial, ordens: [], valorTotal: 0 };
        lista.push(grupo);
        gruposPorNF.set(chaveNF, lista);
      }
      grupo.ordens.push(ordem);
      grupo.valorTotal += num(ordem.valorTotal);
    }

    const codigo = ordem.codigoOrdem?.trim();
    if (codigo) {
      let grupo = gruposPorCodigo.get(codigo);
      if (!grupo) {
        grupo = { chaveNF, emissor, cnpj: ordem.cnpj, razaoSocial: ordem.razaoSocial, ordens: [], valorTotal: 0 };
        gruposPorCodigo.set(codigo, grupo);
      }
      grupo.ordens.push(ordem);
      grupo.valorTotal += num(ordem.valorTotal);
    }
  }

  // ── 3. Autorizador: agrupa pedidos por NF + emissor (ou por código) ───────
  type TipoMatch = "NF" | "CODIGO" | "NENHUM";
  interface GrupoPedido {
    tipo: TipoMatch;
    chaveNF: string;
    emissor: string;
    codigo: string;
    pedidos: Pedido[];
  }

  const grupos = new Map<string, GrupoPedido>();

  for (const pedido of pedidos) {
    const chaveNF = normalizarNF(pedido.numeroNotaFiscal);
    const emissor = chaveEmissor(cnpjDoPedido(pedido));
    const codigo = pedido.codigoOrdemPagamento?.trim() ?? "";

    let tipo: TipoMatch;
    let key: string;
    if (chaveNF) {
      tipo = "NF";
      key = `NF:${chaveNF}|${emissor}`;
    } else if (codigo) {
      tipo = "CODIGO";
      key = `COD:${codigo}`;
    } else {
      tipo = "NENHUM";
      key = `NENHUM:${pedido.id}`;
    }

    let grupo = grupos.get(key);
    if (!grupo) {
      grupo = { tipo, chaveNF, emissor, codigo, pedidos: [] };
      grupos.set(key, grupo);
    }
    grupo.pedidos.push(pedido);
  }

  // ── 4. Compara grupo contra grupo ─────────────────────────────────────────
  for (const grupo of grupos.values()) {
    const gp = grupo.pedidos;
    const primeiro = gp[0];
    const somaPedidos = gp.reduce((acc, p) => acc + num(p.valorUnitario), 0);
    const pedidosRef = identificarPedidos(gp);
    const clinicaRef = descreverClinica(primeiro);
    const nfRef = primeiro.numeroNotaFiscal?.trim() || grupo.chaveNF;
    const cnpjAutorizador = cnpjDoPedido(primeiro);

    // Pedido sem nenhuma chave de match
    if (grupo.tipo === "NENHUM") {
      await upsertConciliacao({
        faturamentoId,
        pedidoId: primeiro.id,
        ordemId: null,
        status: "ATENCAO",
        valorAutorizador: somaPedidos,
        valorProteus: null,
        diferenca: null,
      });
      await criarDivergencia({
        faturamentoId,
        tipo: "LINHA_FALTANTE",
        descricao: `Pedido ${pedidosRef} (${clinicaRef}) sem nota fiscal nem código de ordem — não foi possível conciliar`,
        detalhe: {
          pedidos: pedidosRef,
          voucher: primeiro.voucher,
          clinica: clinicaRef,
          _pedidoIds: gp.map((p) => p.id),
        },
        valorAutorizador: somaPedidos,
      });
      continue;
    }

    // Localiza o grupo correspondente no Proteus
    let grupoOrdem: GrupoOrdem | undefined;
    let motivoNaoEncontrado = "";

    if (grupo.tipo === "NF") {
      const candidatos = gruposPorNF.get(grupo.chaveNF) ?? [];
      const exato = candidatos.find((c) => c.emissor === grupo.emissor);
      if (exato) {
        grupoOrdem = exato;
      } else if (candidatos.length === 1 && (!grupo.emissor || !candidatos[0].emissor)) {
        // Um dos lados não informa CNPJ e o número é único no Proteus → casa só pelo número
        grupoOrdem = candidatos[0];
      } else if (candidatos.length === 0) {
        motivoNaoEncontrado = `NF ${nfRef} não encontrada no Proteus`;
      } else {
        const outros = candidatos
          .map((c) => (c.cnpj ? normalizarCnpj(c.cnpj) : "sem CNPJ"))
          .join(", ");
        motivoNaoEncontrado = grupo.emissor
          ? `NF ${nfRef} não encontrada no Proteus para o CNPJ ${normalizarCnpj(cnpjAutorizador)} — com esse número existe apenas de ${outros}`
          : `NF ${nfRef} aparece ${candidatos.length}× no Proteus (${outros}) e o pedido não informa CNPJ para identificar o emissor`;
      }
    } else {
      grupoOrdem = gruposPorCodigo.get(grupo.codigo);
    }

    if (!grupoOrdem) {
      if (grupo.tipo === "CODIGO") {
        // Pedido sem NF, apenas com código de ordem de pagamento, e a OP não
        // consta no Proteus. A OP é informação do Autorizador — a base do
        // Proteus normalmente não traz esse código — portanto isso NÃO é
        // divergência: a conciliação fica PENDENTE (aguardando a nota fiscal).
        for (const pedido of gp) {
          await upsertConciliacao({
            faturamentoId,
            pedidoId: pedido.id,
            ordemId: null,
            status: "PENDENTE",
            valorAutorizador: somaPedidos,
            valorProteus: null,
            diferenca: null,
          });
        }
        continue;
      }

      // NF informada no Autorizador mas não encontrada no Proteus — UMA
      // divergência para a nota, listando os pedidos
      for (const pedido of gp) {
        await upsertConciliacao({
          faturamentoId,
          pedidoId: pedido.id,
          ordemId: null,
          status: "ATENCAO",
          valorAutorizador: somaPedidos,
          valorProteus: null,
          diferenca: null,
        });
      }
      await criarDivergencia({
        faturamentoId,
        tipo: "LINHA_FALTANTE",
        descricao: `${motivoNaoEncontrado} — ${gp.length} pedido${gp.length !== 1 ? "s" : ""} (${pedidosRef}) — ${clinicaRef}`,
        detalhe: {
          nf: nfRef,
          clinica: clinicaRef,
          ...(cnpjAutorizador ? { cnpj: normalizarCnpj(cnpjAutorizador) } : {}),
          pedidos: pedidosRef,
          qtdPedidos: gp.length,
          _pedidoIds: gp.map((p) => p.id),
        },
        valorAutorizador: somaPedidos,
      });
      continue;
    }

    // ── Grupo encontrado: compara valores, CNPJ ─────────────────────────────
    const valorProteus = grupoOrdem.valorTotal;
    const diferenca = Math.abs(somaPedidos - valorProteus);
    const problemas: string[] = [];
    const linhasProteus = grupoOrdem.ordens.length;
    const nfProteusRef = grupoOrdem.ordens[0].numeroNotaFiscal?.trim() || nfRef;
    const referencia = grupo.tipo === "NF" ? `NF ${nfRef}` : `Ordem ${grupo.codigo} (NF ${nfProteusRef})`;

    const detalheBase = {
      nf: grupo.tipo === "NF" ? nfRef : nfProteusRef,
      ...(grupo.tipo === "CODIGO" ? { ordem: grupo.codigo } : {}),
      clinica: clinicaRef,
      ...(cnpjAutorizador ? { cnpjAutorizador: normalizarCnpj(cnpjAutorizador) } : {}),
      ...(grupoOrdem.cnpj ? { cnpjProteus: normalizarCnpj(grupoOrdem.cnpj) } : {}),
      pedidos: pedidosRef,
      qtdPedidos: gp.length,
      linhasProteus,
      _pedidoIds: gp.map((p) => p.id),
      _ordemIds: grupoOrdem.ordens.map((o) => o.id),
    };

    // Valor divergente (tolerance R$ 0,01) — uma divergência por nota
    if (diferenca > 0.01) {
      problemas.push("VALOR_DIVERGENTE");
      await criarDivergencia({
        faturamentoId,
        tipo: "VALOR_DIVERGENTE",
        descricao:
          `${referencia} (${clinicaRef}): Autorizador ${formatarBRL(somaPedidos)} ` +
          `(${gp.length} pedido${gp.length !== 1 ? "s" : ""}: ${pedidosRef}) ≠ Proteus ${formatarBRL(valorProteus)} ` +
          `(${linhasProteus} linha${linhasProteus !== 1 ? "s" : ""})`,
        detalhe: detalheBase,
        valorAutorizador: somaPedidos,
        valorProteus,
      });
    }

    // CNPJ divergente: emissores conhecidos dos dois lados e CNPJs completos
    // diferentes. No match por NF a raiz é igual por construção (matriz ×
    // filial); no match por código pode ser um parceiro diferente.
    const cnpjAut = normalizarCnpj(cnpjAutorizador ?? "");
    const cnpjPro = normalizarCnpj(grupoOrdem.cnpj ?? "");
    if (cnpjAut && cnpjPro && cnpjAut !== cnpjPro) {
      problemas.push("CNPJ_DIFERENTE");
      const mesmaRaiz = chaveEmissor(cnpjAut) === chaveEmissor(cnpjPro);
      await criarDivergencia({
        faturamentoId,
        tipo: "CNPJ_DIFERENTE",
        descricao:
          `${referencia}: CNPJ de faturamento no Autorizador ${cnpjAut} ≠ CNPJ pago no Proteus ${cnpjPro}` +
          (mesmaRaiz ? " (mesma raiz — matriz/filial)" : "") +
          ` — ${clinicaRef}`,
        detalhe: detalheBase,
      });
    }

    for (const pedido of gp) {
      await upsertConciliacao({
        faturamentoId,
        pedidoId: pedido.id,
        ordemId: grupoOrdem.ordens[0].id,
        status: problemas.length > 0 ? "ATENCAO" : "OK",
        valorAutorizador: somaPedidos,
        valorProteus,
        diferenca,
      });
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function num(v: Prisma.Decimal | null): number {
  return v ? Number(v) : 0;
}

interface PedidoRef {
  voucher: string;
  codigoPedido: string | null;
  cnpjClinica: string | null;
  nomeClinica: string | null;
  clinica: { cnpj: string; razaoSocial: string; nomeFantasia: string | null } | null;
}

/** Identificador que a operação reconhece: Pedido ID, ou o voucher na falta dele. */
export function identificarPedido(p: Pick<PedidoRef, "voucher" | "codigoPedido">): string {
  return p.codigoPedido?.trim() || p.voucher;
}

function identificarPedidos(ps: PedidoRef[], max = 8): string {
  const ids = ps.map(identificarPedido);
  if (ids.length <= max) return ids.join(", ");
  return `${ids.slice(0, max).join(", ")} (+${ids.length - max})`;
}

function cnpjDoPedido(p: PedidoRef): string | null {
  return p.cnpjClinica || p.clinica?.cnpj || null;
}

function descreverClinica(p: PedidoRef): string {
  const nome = p.clinica?.nomeFantasia || p.clinica?.razaoSocial || p.nomeClinica || null;
  const cnpj = cnpjDoPedido(p);
  if (nome && cnpj) return `${nome} — ${normalizarCnpj(cnpj)}`;
  if (nome) return nome;
  if (cnpj) return `CNPJ ${normalizarCnpj(cnpj)}`;
  return "clínica não identificada";
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
    | "VALOR_NAO_RECONHECIDO"
    | "OUTRO";
  descricao: string;
  detalhe?: Record<string, unknown>;
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
