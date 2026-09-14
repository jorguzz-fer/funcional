import { LimparProteusResult, LinhaProteusDescartada, OrdemInput } from "./types";
import {
  normalizarCnpj,
  parsearValor,
  valorIlegivel,
  textoCelula,
  encontrarColuna,
  descreverCabecalhos,
} from "./utils";

/**
 * Column mapping definitions for the Proteus spreadsheet.
 *
 * O código da ordem de pagamento (OP) é OPCIONAL: a OP pertence ao
 * Autorizador e normalmente não existe na base do Proteus. Quando a coluna
 * não vem no relatório, a conciliação usa apenas a nota fiscal.
 */
const COLUMN_MAP = {
  // "Documento" is the SAP payment document (= ordem de pagamento code in Proteus exports)
  codigoOrdem: ["codigo da ordem", "codigo op", "codigo ordem", "op", "documento"],
  // "NF Original" is the NF number in Proteus/SAP exports
  numeroNotaFiscal: ["nf original", "numero da nota", "numero nota fiscal", "nota fiscal", "numero nf", "nf"],
  // "Vlr.Total" is the abbreviation used in Proteus/SAP exports.
  // Candidate order = priority; "valor" alone is the last resort.
  valorTotal: ["vlr total", "vlr.total", "valor total", "valor liquido", "vlr liquido", "valor pago", "valor"],
  // "Rz.Social" is the abbreviation used in Proteus/SAP exports
  razaoSocial: ["rz.social", "rz social", "razao social", "nome"],
  // "CNPJ/CPF" is the combined field in Proteus/SAP exports
  cnpj: ["cnpj/cpf", "cnpj"],
  status: ["status"],
} as const;

type FieldKey = keyof typeof COLUMN_MAP;

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

interface LimparProteusOpcoes {
  /**
   * Número (1-based) da primeira linha de dados na planilha, usado apenas
   * para apontar ao usuário a linha de um valor não reconhecido.
   * Default 2 (cabeçalho na linha 1).
   */
  primeiraLinha?: number;
}

/**
 * Cleans and normalizes rows from the Proteus (Ordens de Pagamento) spreadsheet.
 *
 * Linhas com valor em branco/zero são ignoradas. Linhas cujo valor tem
 * conteúdo numérico que não pôde ser interpretado (formato inesperado da
 * célula) também são ignoradas, mas ficam listadas em
 * `valoresNaoReconhecidos` para virarem divergência visível ao usuário.
 *
 * @param rows  Raw rows parsed from the xlsx file.
 */
export function limparProteus(
  rows: Record<string, unknown>[],
  opcoes: LimparProteusOpcoes = {},
): LimparProteusResult {
  if (rows.length === 0) return { ordens: [], valoresNaoReconhecidos: [] };

  const primeiraLinha = opcoes.primeiraLinha ?? 2;

  const headers = Object.keys(rows[0]);
  const col = resolveHeaders(headers);

  // Sem valor não há o que conciliar; sem NF nem código de ordem não há
  // como casar as linhas com o Autorizador. (A OP sozinha é opcional.)
  const faltando: string[] = [];
  if (!col.valorTotal) faltando.push("valor");
  if (!col.numeroNotaFiscal && !col.codigoOrdem) faltando.push("nota fiscal");
  if (faltando.length > 0) {
    throw new Error(
      `Planilha do Proteus sem coluna de ${faltando.join(" e ")} reconhecida. ` +
        `Cabeçalhos lidos: ${descreverCabecalhos(headers)}`,
    );
  }

  const ordens: OrdemInput[] = [];
  const valoresNaoReconhecidos: LinhaProteusDescartada[] = [];

  rows.forEach((row, i) => {
    const codigoOrdem = String(getCell(row, col.codigoOrdem) ?? "").trim() || null;
    const numeroNotaFiscal = String(getCell(row, col.numeroNotaFiscal) ?? "").trim() || null;

    const valorRaw = getCell(row, col.valorTotal);
    const valorTotal = parsearValor(valorRaw);

    if (valorTotal === null && valorIlegivel(valorRaw)) {
      valoresNaoReconhecidos.push({
        linha: primeiraLinha + i,
        valorBruto: textoCelula(valorRaw),
        codigoOrdem,
        numeroNotaFiscal,
      });
      return;
    }

    // Exclude rows with zero or blank value
    if (!valorTotal) return;

    const razaoSocial = String(getCell(row, col.razaoSocial) ?? "").trim() || null;
    const status = String(getCell(row, col.status) ?? "").trim() || null;
    const cnpjRaw = getCell(row, col.cnpj);
    const cnpj = normalizarCnpj(cnpjRaw != null ? String(cnpjRaw) : null);

    ordens.push({
      codigoOrdem,
      numeroNotaFiscal,
      valorTotal,
      cnpj: cnpj || null,
      razaoSocial,
      status,
    });
  });

  return { ordens, valoresNaoReconhecidos };
}
