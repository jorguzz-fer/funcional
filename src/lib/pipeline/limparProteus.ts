import { OrdemInput } from "./types";
import { normalizarCnpj, parsearValor, encontrarColuna } from "./utils";

/**
 * Column mapping definitions for the Proteus spreadsheet.
 */
const COLUMN_MAP = {
  // "Documento" is the SAP payment document (= ordem de pagamento code in Proteus exports)
  codigoOrdem: ["codigo da ordem", "codigo op", "codigo ordem", "op", "documento"],
  // "NF Original" is the NF number in Proteus/SAP exports
  numeroNotaFiscal: ["nf original", "numero da nota", "numero nota fiscal", "nota fiscal", "numero nf", "nf"],
  // "Vlr.Total" is the abbreviation used in Proteus/SAP exports
  valorTotal: ["vlr.total", "vlr total", "valor total", "valor"],
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

/**
 * Cleans and normalizes rows from the Proteus (Ordens de Pagamento) spreadsheet.
 *
 * @param rows  Raw rows parsed from the xlsx file.
 * @returns     Array of OrdemInput ready for persistence.
 */
export function limparProteus(rows: Record<string, unknown>[]): OrdemInput[] {
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  const col = resolveHeaders(headers);

  const result: OrdemInput[] = [];

  for (const row of rows) {
    const valorTotal = parsearValor(getCell(row, col.valorTotal));

    // Exclude rows with zero or blank value
    if (!valorTotal || isNaN(valorTotal)) continue;

    const codigoOrdem = String(getCell(row, col.codigoOrdem) ?? "").trim() || null;
    const numeroNotaFiscal = String(getCell(row, col.numeroNotaFiscal) ?? "").trim() || null;
    const razaoSocial = String(getCell(row, col.razaoSocial) ?? "").trim() || null;
    const status = String(getCell(row, col.status) ?? "").trim() || null;
    const cnpjRaw = getCell(row, col.cnpj);
    const cnpj = normalizarCnpj(cnpjRaw != null ? String(cnpjRaw) : null);

    result.push({
      codigoOrdem,
      numeroNotaFiscal,
      valorTotal,
      cnpj: cnpj || null,
      razaoSocial,
      status,
    });
  }

  return result;
}
