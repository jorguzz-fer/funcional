import { PedidoInput } from "./types";
import {
  normalizarCnpj,
  parsearData,
  parsearValor,
  normalizarTexto,
  encontrarColuna,
} from "./utils";

interface FaturamentoRef {
  dataInicio: Date;
  dataFechamento: Date;
}

/**
 * Column mapping definitions for the Autorizador spreadsheet.
 * Each entry lists candidate header names (in Portuguese) that should be
 * recognized as a given field.
 */
const COLUMN_MAP = {
  voucher: ["voucher", "codigo de autorizacao", "codigo autorizacao"],
  codigoPaciente: ["codigo do paciente", "codigo paciente", "codigo paciente", "bra"],
  // "Data Utilização" (Clínicas e Labs export) or "Data_Infusao" (faturamento export)
  dataInfusao: ["data de infusao", "data infusao", "data utilizacao"],
  // "Data da finalização" or "Data do Envio NF" (Clínicas e Labs format — NF sent = finalized)
  dataFinalizacaoVoucher: ["data de finalizacao", "data finalizacao", "data finalizacao voucher", "data da finalizacao", "data do envio nf", "data envio nf"],
  dataFaturamento: ["data de faturamento", "data faturamento"],
  // Use more specific candidates before the broad "status" fallback to avoid
  // matching "Status_Ordem_Pagamento" instead of "Status_Pedido"
  statusVoucher: ["status pedido", "status do pedido", "status voucher", "status"],
  lote: ["lote"],
  valorUnitario: ["valor unitario", "vlr.unitario", "vlr unitario", "valor liquido"],
  // "PO" is the purchase order code in the Clínicas e Labs export
  codigoOrdemPagamento: ["po", "cod. ordem pagamento", "cod ordem pagamento", "codigo da ordem", "codigo da ordem de pagamento", "codigo ordem"],
  statusOrdemPagamento: ["status da ordem", "status ordem pagamento", "status ordem"],
  nomeExame: ["nome do exame", "nome exame", "exame", "servico", "procedimento"],
  cnpjClinica: ["cnpj faturamento", "cnpj de faturamento", "cnpj utilizacao", "cnpj"],
  nomeClinica: ["nome da clinica utilizacao", "nome da clinica", "nome fantasia", "clinica"],
  numeroNotaFiscal: ["numero da nota fiscal", "numero nota fiscal", "nota fiscal", "nf"],
  articulacaoId: ["articulacao", "articulacao id", "id articulacao", "id pedido"],
  dsp: ["dsp/psp", "dsp", "diagnostico"],
} as const;

type FieldKey = keyof typeof COLUMN_MAP;

/**
 * Resolves the column lookup map: given a set of actual headers from the file,
 * returns a Record<fieldKey, actualHeaderName>.
 */
function resolveHeaders(headers: string[]): Partial<Record<FieldKey, string>> {
  const resolved: Partial<Record<FieldKey, string>> = {};
  for (const [field, candidates] of Object.entries(COLUMN_MAP) as [FieldKey, readonly string[]][]) {
    const found = encontrarColuna(headers, candidates as string[]);
    if (found) {
      resolved[field] = found;
    }
  }
  return resolved;
}

function getCell(row: Record<string, unknown>, header: string | undefined): unknown {
  if (!header) return undefined;
  return row[header];
}

/**
 * Detects whether a row represents an exam (EXAME) or infusion (INFUSAO)
 * based on the "nome do exame" column value.
 */
function detectarTipo(nomeExame: unknown): "EXAME" | "INFUSAO" {
  const texto = normalizarTexto(nomeExame);
  if (texto.includes("exame") || texto.includes("laborat")) return "EXAME";
  return "INFUSAO";
}

/**
 * Returns true if the medicament name suggests it requires a lot number
 * (Remicade or Stelara, which are biologic products tracked by lot).
 */
function exigeLote(nomeExame: unknown): boolean {
  const texto = normalizarTexto(nomeExame);
  return texto.includes("remicade") || texto.includes("stelara");
}

/**
 * Main cleaning function for the Autorizador spreadsheet.
 *
 * @param rows   Raw rows parsed from the xlsx file (one object per row,
 *               keys are column headers).
 * @param faturamento  Date range used to filter infusions.
 * @returns      Array of PedidoInput ready for persistence.
 */
export function limparAutorizador(
  rows: Record<string, unknown>[],
  faturamento: FaturamentoRef,
): PedidoInput[] {
  if (rows.length === 0) return [];

  // Resolve headers once, using the first row's keys as column names
  const headers = Object.keys(rows[0]);
  const col = resolveHeaders(headers);

  const { dataInicio, dataFechamento } = faturamento;

  return rows.map((row): PedidoInput => {
    const voucher = String(getCell(row, col.voucher) ?? "").trim();
    const codigoPaciente = String(getCell(row, col.codigoPaciente) ?? "").trim();
    const statusVoucher = String(getCell(row, col.statusVoucher) ?? "").trim().toUpperCase();
    const lote = String(getCell(row, col.lote) ?? "").trim() || null;
    const nomeExame = getCell(row, col.nomeExame);
    const cnpjRaw = getCell(row, col.cnpjClinica);
    const codigoOrdemPagamento = String(getCell(row, col.codigoOrdemPagamento) ?? "").trim() || null;
    const statusOrdemPagamento = String(getCell(row, col.statusOrdemPagamento) ?? "").trim() || null;
    const numeroNotaFiscal = String(getCell(row, col.numeroNotaFiscal) ?? "").trim() || null;
    const articulacaoId = String(getCell(row, col.articulacaoId) ?? "").trim() || null;
    const dsp = String(getCell(row, col.dsp) ?? "").trim() || null;
    const nomeClinica = String(getCell(row, col.nomeClinica) ?? "").trim() || null;

    const dataInfusao = parsearData(getCell(row, col.dataInfusao));
    const dataFinalizacaoVoucher = parsearData(getCell(row, col.dataFinalizacaoVoucher));
    const dataFaturamento = parsearData(getCell(row, col.dataFaturamento));

    const valorUnitario = parsearValor(getCell(row, col.valorUnitario));

    const cnpjClinica = normalizarCnpj(cnpjRaw != null ? String(cnpjRaw) : null);

    // AGE: days between infusion date and the reference closing date (informational)
    let ageDias: number | null = null;
    if (dataInfusao) {
      const diffMs = dataFechamento.getTime() - dataInfusao.getTime();
      ageDias = Math.floor(diffMs / 86400000);
    }

    const tipo = detectarTipo(nomeExame);

    const nomeExameStr = nomeExame != null ? String(nomeExame).trim() || null : null;

    const baseFields = {
      voucher,
      codigoPaciente,
      nomeExame: nomeExameStr,
      dataInfusao,
      dataFinalizacaoVoucher,
      dataFaturamento,
      ageDias,
      statusVoucher: statusVoucher || null,
      lote,
      valorUnitario,
      codigoOrdemPagamento,
      statusOrdemPagamento,
      cnpjClinica,
      nomeClinica,
      numeroNotaFiscal,
      articulacaoId,
      dsp,
      tipo,
    };

    // ─── Exclusion filters ─────────────────────────────────────────────────

    // Infusion date outside the billing period
    if (dataInfusao && (dataInfusao < dataInicio || dataInfusao > dataFechamento)) {
      return { ...baseFields, excluido: true, motivoExclusao: "Fora do período de faturamento" };
    }

    if (statusVoucher === "CONSULTADO") {
      return { ...baseFields, excluido: true, motivoExclusao: "Voucher consultado" };
    }

    if (statusVoucher === "GLOSADO") {
      return { ...baseFields, excluido: true, motivoExclusao: "Voucher glosado" };
    }

    // No ordem de pagamento AND no data de finalizacao
    if (!codigoOrdemPagamento && !dataFinalizacaoVoucher) {
      return { ...baseFields, excluido: true, motivoExclusao: "Sem finalização" };
    }

    // ─── Alerts (non-excluding) ────────────────────────────────────────────
    const alertas: string[] = [];
    if (exigeLote(nomeExame) && !lote) {
      alertas.push("LOTE_AUSENTE");
    }

    return { ...baseFields, excluido: false, alertas };
  });
}
