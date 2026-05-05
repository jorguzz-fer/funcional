import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { limparAutorizador } from "./limparAutorizador";
import { limparProteus } from "./limparProteus";
import { executarConciliacao } from "./conciliar";
import { PedidoInput } from "./types";

/**
 * Main pipeline orchestrator.
 *
 * Called asynchronously (fire-and-forget) from the POST /api/faturamento route.
 * Reads both uploaded files, cleans the data, persists Pedidos and
 * OrdemPagamento records, runs conciliation, and updates upload statuses.
 */
export async function processarFaturamento(faturamentoId: string): Promise<void> {
  // 1. Fetch Faturamento and its upload files
  const faturamento = await prisma.faturamento.findUnique({
    where: { id: faturamentoId },
    include: { uploads: true },
  });

  if (!faturamento) {
    console.error(`[pipeline] Faturamento ${faturamentoId} não encontrado`);
    return;
  }

  const uploadAutorizador = faturamento.uploads.find((u) => u.tipo === "AUTORIZADOR");
  const uploadProteus = faturamento.uploads.find((u) => u.tipo === "PROTEUS");

  if (!uploadAutorizador || !uploadProteus) {
    console.error(`[pipeline] Faturamento ${faturamentoId} sem arquivos de upload`);
    return;
  }

  // 2. Update status to EM_REVISAO
  await prisma.faturamento.update({
    where: { id: faturamentoId },
    data: { status: "EM_REVISAO" },
  });

  try {
    // 3. Parse AUTORIZADOR xlsx
    const wbAut = XLSX.readFile(uploadAutorizador.caminho);
    const wsAut = wbAut.Sheets[wbAut.SheetNames[0]];
    const rowsAut: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wsAut, { defval: "" });

    // 4. Parse PROTEUS xlsx
    const wbPro = XLSX.readFile(uploadProteus.caminho);
    const wsPro = wbPro.Sheets[wbPro.SheetNames[0]];
    const rowsPro: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wsPro, { defval: "" });

    // 5. Clean data
    const pedidosInput = limparAutorizador(rowsAut, {
      mesReferencia: faturamento.mesReferencia,
      anoReferencia: faturamento.anoReferencia,
    });

    const ordensInput = limparProteus(rowsPro);

    // 6 & 7. Persist Pedidos (upsert por voucher + articulacaoId)
    for (const p of pedidosInput) {
      await salvarPedido(faturamentoId, p);
    }

    // 8. Persist OrdemPagamento
    for (const o of ordensInput) {
      await prisma.ordemPagamento.create({
        data: {
          faturamentoId,
          codigoOrdem: o.codigoOrdem ?? null,
          numeroNotaFiscal: o.numeroNotaFiscal ?? null,
          valorTotal: o.valorTotal ?? null,
          cnpj: o.cnpj ?? null,
          razaoSocial: o.razaoSocial ?? null,
          status: o.status ?? null,
        },
      });
    }

    // 9. Run conciliation
    await executarConciliacao(faturamentoId);

    // 10. Mark both uploads as processed
    await prisma.uploadArquivo.updateMany({
      where: { faturamentoId },
      data: {
        processado: true,
        linhasTotal: undefined, // keep existing
      },
    });

    await prisma.uploadArquivo.update({
      where: { id: uploadAutorizador.id },
      data: { processado: true, linhasTotal: rowsAut.length },
    });

    await prisma.uploadArquivo.update({
      where: { id: uploadProteus.id },
      data: { processado: true, linhasTotal: rowsPro.length },
    });

    await prisma.faturamento.update({
      where: { id: faturamentoId },
      data: { status: "CONCILIADO" },
    });

    console.log(
      `[pipeline] Faturamento ${faturamentoId} processado com sucesso. ` +
        `Pedidos: ${pedidosInput.length}, Ordens: ${ordensInput.length}`,
    );
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    console.error(`[pipeline] Erro ao processar faturamento ${faturamentoId}:`, err);

    // 11. Mark uploads with error
    const erroPayload = { mensagem, timestamp: new Date().toISOString() };

    await prisma.uploadArquivo.update({
      where: { id: uploadAutorizador.id },
      data: { erros: erroPayload },
    });

    await prisma.uploadArquivo.update({
      where: { id: uploadProteus.id },
      data: { erros: erroPayload },
    });
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Upserts a Pedido by (faturamentoId, voucher, articulacaoId).
 * Attempts to resolve the Clinica from the cnpj in the input, if present.
 */
async function salvarPedido(faturamentoId: string, p: PedidoInput): Promise<void> {
  // Resolve clinicaId from CNPJ (best-effort)
  let clinicaId: string | null = null;
  if (p.cnpjClinica) {
    const clinica = await prisma.clinica.findUnique({
      where: { cnpj: p.cnpjClinica },
      select: { id: true },
    });
    clinicaId = clinica?.id ?? null;
  }

  const statusVoucher = resolveStatusVoucher(p.statusVoucher);
  const statusOrdemPagamento = resolveStatusOrdem(p.statusOrdemPagamento);

  // Create divergências for alerts before upserting
  const pedidoData = {
    faturamentoId,
    clinicaId,
    voucher: p.voucher,
    articulacaoId: p.articulacaoId ?? null,
    codigoPaciente: p.codigoPaciente,
    dataInfusao: p.dataInfusao ?? null,
    dataFinalizacaoVoucher: p.dataFinalizacaoVoucher ?? null,
    dataFaturamento: p.dataFaturamento ?? null,
    ageDias: p.ageDias ?? null,
    statusVoucher,
    statusOrdemPagamento,
    lote: p.lote ?? null,
    valorUnitario: p.valorUnitario ?? null,
    codigoOrdemPagamento: p.codigoOrdemPagamento ?? null,
    numeroNotaFiscal: p.numeroNotaFiscal ?? null,
    dsp: p.dsp ?? null,
    excluido: p.excluido,
    motivoExclusao: p.motivoExclusao ?? null,
  };

  const uniqueWhere = {
    faturamentoId_voucher_articulacaoId: {
      faturamentoId,
      voucher: p.voucher,
      articulacaoId: p.articulacaoId ?? "",
    },
  };

  let savedId: string;

  try {
    const saved = await prisma.pedido.upsert({
      where: uniqueWhere,
      create: pedidoData,
      update: pedidoData,
      select: { id: true },
    });
    savedId = saved.id;
  } catch {
    // If the compound unique doesn't exist yet in schema, fall back to plain create
    const created = await prisma.pedido.create({
      data: pedidoData,
      select: { id: true },
    });
    savedId = created.id;
  }

  // Create LOTE_AUSENTE divergencias for alert rows
  if (p.alertas?.includes("LOTE_AUSENTE")) {
    await prisma.divergencia.create({
      data: {
        faturamentoId,
        tipo: "LOTE_AUSENTE",
        descricao: `Pedido ${p.voucher} sem número de lote para medicamento que exige rastreabilidade`,
        detalhe: { pedidoId: savedId, voucher: p.voucher },
      },
    });
  }
}

function resolveStatusVoucher(
  raw: string | null | undefined,
): "CONSULTADO" | "FINALIZADO" | "GLOSADO" | null {
  if (!raw) return null;
  const upper = raw.toUpperCase().trim();
  if (upper === "CONSULTADO") return "CONSULTADO";
  if (upper === "FINALIZADO") return "FINALIZADO";
  if (upper === "GLOSADO") return "GLOSADO";
  return null;
}

function resolveStatusOrdem(
  raw: string | null | undefined,
): "AGUARDANDO_NOTA_FISCAL" | "NOTA_FISCAL_EM_ANALISE" | "ENVIADA_PARA_FATURAMENTO" | null {
  if (!raw) return null;
  const upper = raw.toUpperCase().trim().replace(/\s+/g, "_");
  if (upper.includes("AGUARDANDO")) return "AGUARDANDO_NOTA_FISCAL";
  if (upper.includes("ANALISE") || upper.includes("ANÁLISE")) return "NOTA_FISCAL_EM_ANALISE";
  if (upper.includes("ENVIADA") || upper.includes("FATURAMENTO")) return "ENVIADA_PARA_FATURAMENTO";
  return null;
}
