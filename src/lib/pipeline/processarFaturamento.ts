import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { limparAutorizador } from "./limparAutorizador";
import { limparProteus } from "./limparProteus";
import { executarConciliacao } from "./conciliar";
import { detectarLinhaHeader } from "./utils";
import { PedidoInput } from "./types";

interface FileBuffers {
  autorizador: Buffer;
  proteus: Buffer;
}

/**
 * Main pipeline orchestrator.
 *
 * Receives in-memory file buffers directly from the API route to avoid
 * filesystem access issues in containerized environments.
 */
export async function processarFaturamento(
  faturamentoId: string,
  buffers: FileBuffers,
): Promise<void> {
  // 1. Fetch Faturamento and its upload metadata (IDs needed for status updates)
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
    console.error(`[pipeline] Faturamento ${faturamentoId} sem registros de upload no DB`);
    return;
  }

  // 2. Update status to EM_REVISAO
  await prisma.faturamento.update({
    where: { id: faturamentoId },
    data: { status: "EM_REVISAO" },
  });

  try {
    // 3. Parse AUTORIZADOR xlsx from in-memory buffer (no disk read)
    const wbAut = XLSX.read(buffers.autorizador, { type: "buffer" });
    const wsAut = wbAut.Sheets[wbAut.SheetNames[0]];
    const headerRowAut = detectarLinhaHeader(wsAut);
    const rowsAut: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wsAut, {
      defval: "",
      range: headerRowAut,
    });

    // 4. Parse PROTEUS xlsx from in-memory buffer
    const wbPro = XLSX.read(buffers.proteus, { type: "buffer" });
    const METADATA_SHEETS = ["parametros", "params", "configuracao", "config"];
    const dataSheetName =
      wbPro.SheetNames.find((s) => !METADATA_SHEETS.includes(s.toLowerCase())) ??
      wbPro.SheetNames[wbPro.SheetNames.length - 1];
    const wsPro = wbPro.Sheets[dataSheetName];
    const headerRowPro = detectarLinhaHeader(wsPro);
    const rowsPro: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wsPro, {
      defval: "",
      range: headerRowPro,
    });

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

  // Check if a Pedido with this voucher+articulacaoId already exists for this faturamento
  // (supports re-processing without duplicates)
  const existing = await prisma.pedido.findFirst({
    where: {
      faturamentoId,
      voucher: p.voucher,
      articulacaoId: p.articulacaoId ?? null,
    },
    select: { id: true },
  });

  let savedId: string;

  if (existing) {
    await prisma.pedido.update({
      where: { id: existing.id },
      data: pedidoData,
    });
    savedId = existing.id;
  } else {
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
        detalhe: { pedidoId: savedId, voucher: p.voucher } as Prisma.InputJsonValue,
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
