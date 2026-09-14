/**
 * Pipeline utility functions shared across limparAutorizador, limparProteus, and conciliar.
 */
import * as XLSX from "xlsx";

/**
 * Normalizes a Brazilian CNPJ string.
 * Strips all non-digit characters and re-applies the XX.XXX.XXX/XXXX-XX mask.
 * Returns an empty string if the input doesn't yield exactly 14 digits.
 */
export function normalizarCnpj(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length !== 14) return digits; // return as-is if not the expected length
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Parses a date value from various representations:
 *  - JS Date object
 *  - Excel serial number (number)
 *  - String in DD/MM/YYYY or YYYY-MM-DD format
 * Always zeroes out the time component (midnight UTC).
 * Returns null when parsing fails.
 */
export function parsearData(raw: unknown): Date | null {
  if (raw == null || raw === "") return null;

  // Already a Date
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    const d = new Date(raw);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Excel serial number (days since 1900-01-00, with the infamous leap-year bug)
  if (typeof raw === "number") {
    // Excel's date serial: 1 = 1900-01-01; there is a bug where 1900-02-29 is treated as valid
    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // 1899-12-30
    const ms = excelEpoch.getTime() + raw * 86400000;
    const d = new Date(ms);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  if (typeof raw === "string") {
    const s = raw.trim();

    // DD/MM/YYYY
    const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
      const d = new Date(Date.UTC(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1])));
      return isNaN(d.getTime()) ? null : d;
    }

    // YYYY-MM-DD (possibly with time component)
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const d = new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])));
      return isNaN(d.getTime()) ? null : d;
    }

    // Fallback: try native Date parsing
    const fallback = new Date(s);
    if (!isNaN(fallback.getTime())) {
      fallback.setHours(0, 0, 0, 0);
      return fallback;
    }
  }

  return null;
}

/**
 * Símbolos/códigos de moeda e palavras que podem acompanhar um valor numa
 * célula em formato "Geral" (texto) e que devem ser ignorados no parse.
 */
const MOEDA_RE = /R\$|US\$|BRL|USD|EUR|[$€£¥]|reais|real/gi;

/** Espaços comuns e "invisíveis" (NBSP, narrow NBSP) usados como separador de milhar. */
const ESPACOS_RE = /[\s  ]+/g;

/**
 * Parses a currency/decimal value coming from a spreadsheet cell.
 *
 * Accepts:
 *  - JS number → returned as-is (NaN / Infinity → null)
 *  - Brazilian text: "1.234,56", "R$ 1.234,56", "1234,56", "1 234,56"
 *  - International text: "1234.56", "1,234.56", "$1,234.56"
 *  - Negatives: "-1.234,56", "1.234,56-" (SAP/Proteus), "(1.234,56)" (contábil)
 *
 * Separator rules when the text is ambiguous:
 *  - Both "," and "." present → the LAST one is the decimal separator.
 *  - Only "," → decimal separator (padrão brasileiro); several commas → milhar.
 *  - Only "." → decimal, EXCEPT when there are several dots or exactly 3 digits
 *    after the single dot ("1.850" → 1850, padrão brasileiro de milhar).
 *
 * Returns null when the cell is blank, is only a placeholder ("-", "—") or
 * the text cannot be interpreted as a number. Callers that need to tell
 * "blank" apart from "unreadable" should use `valorIlegivel`.
 */
export function parsearValor(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "boolean" || raw instanceof Date) return null;

  let s = String(raw).trim();
  if (s === "") return null;

  let negativo = false;

  // Contábil: "(1.234,56)"
  const parenteses = s.match(/^\((.*)\)$/);
  if (parenteses) {
    negativo = true;
    s = parenteses[1];
  }

  s = s.replace(MOEDA_RE, "").replace(ESPACOS_RE, "");

  // Sinal à direita (estilo SAP "1.234,56-") ou à esquerda
  if (s.endsWith("-")) {
    negativo = !negativo;
    s = s.slice(0, -1);
  }
  if (s.startsWith("+") || s.startsWith("-")) {
    if (s.startsWith("-")) negativo = !negativo;
    s = s.slice(1);
  }

  // A partir daqui só são aceitos dígitos e separadores
  if (s === "" || !/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  const ultimaVirgula = s.lastIndexOf(",");
  const ultimoPonto = s.lastIndexOf(".");
  let normalizado: string;

  if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
    normalizado =
      ultimaVirgula > ultimoPonto
        ? s.replace(/\./g, "").replace(",", ".") // "1.234,56" → "1234.56"
        : s.replace(/,/g, ""); //                   "1,234.56" → "1234.56"
  } else if (ultimaVirgula >= 0) {
    const qtdVirgulas = s.split(",").length - 1;
    normalizado = qtdVirgulas > 1 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (ultimoPonto >= 0) {
    const qtdPontos = s.split(".").length - 1;
    const digitosAposPonto = s.length - ultimoPonto - 1;
    normalizado = qtdPontos > 1 || digitosAposPonto === 3 ? s.replace(/\./g, "") : s;
  } else {
    normalizado = s;
  }

  if (!/^\d+(\.\d+)?$/.test(normalizado)) return null;

  const n = Number(normalizado);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

/**
 * Indica que a célula tem conteúdo com aparência numérica (contém dígitos)
 * mas `parsearValor` não conseguiu interpretá-la. Serve para sinalizar ao
 * usuário um valor "não reconhecido" em vez de tratá-lo silenciosamente
 * como vazio/zero. Placeholders sem dígitos ("-", "N/A") NÃO são ilegíveis.
 */
export function valorIlegivel(raw: unknown): boolean {
  if (raw == null || typeof raw === "number" || typeof raw === "boolean") return false;
  const s = String(raw).trim();
  if (s === "" || !/\d/.test(s)) return false;
  return parsearValor(raw) === null;
}

/**
 * Texto original da célula, para exibição em mensagens de erro
 * (limitado para não poluir a divergência).
 */
export function textoCelula(raw: unknown): string {
  if (raw == null) return "";
  return String(raw).trim().slice(0, 80);
}

/**
 * Normalizes text for tolerant column-name matching:
 * trim + lowercase + remove accents.
 */
export function normalizarTexto(raw: unknown): string {
  if (raw == null) return "";
  return String(raw)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/_/g, " ");
}

/**
 * Finds the first row in a worksheet that looks like a header row
 * (has at least 3 non-empty string cells). Some Autorizador exports have
 * 1-2 blank rows before the actual column headers.
 */
export function detectarLinhaHeader(ws: XLSX.WorkSheet): number {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  for (let i = 0; i < Math.min(20, raw.length); i++) {
    const row = raw[i] as unknown[];
    const stringCells = row.filter((v) => typeof v === "string" && v.trim().length > 1);
    if (stringCells.length >= 3) return i;
  }
  return 0;
}

/**
 * Normalization used for column-name matching only: on top of normalizarTexto,
 * punctuation commonly used in export headers ("Vlr.Total", "CNPJ/CPF",
 * "Cod. Ordem") is turned into spaces and whitespace is collapsed, so
 * "Vlr.Total", "Vlr. Total" and "VLR_TOTAL" all match the same candidate.
 */
export function normalizarCabecalho(raw: unknown): string {
  return normalizarTexto(raw)
    .replace(/[.\-/:;()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lista legível dos cabeçalhos de uma planilha, para mensagens de erro
 * (ignora colunas sem nome geradas pelo SheetJS, como "__EMPTY_3").
 */
export function descreverCabecalhos(headers: string[], max = 15): string {
  const nomes = headers.filter((h) => h && !h.startsWith("__EMPTY")).map((h) => `"${h}"`);
  if (nomes.length === 0) return "(nenhum)";
  const lista = nomes.slice(0, max).join(", ");
  return nomes.length > max ? `${lista} (+${nomes.length - max})` : lista;
}

/**
 * Finds the header that fuzzy-matches one of the given candidates.
 *
 * Matching ignores accents, case, punctuation and surrounding spaces.
 * Candidate ORDER defines priority: an exact match on any candidate wins
 * first (earlier candidates first); then substring containment is tried,
 * again in candidate order, so specific names ("valor unitario") always win
 * over generic fallbacks ("valor") regardless of the column order in the file.
 */
export function encontrarColuna(headers: string[], candidatos: string[]): string | undefined {
  const cabecalhos = headers.map((header) => ({ header, norm: normalizarCabecalho(header) }));
  const normalizedCandidatos = candidatos.map(normalizarCabecalho);

  // 1. Exact normalized match, in candidate priority order
  for (const cand of normalizedCandidatos) {
    const found = cabecalhos.find((h) => h.norm === cand);
    if (found) return found.header;
  }

  // 2. Substring containment: the header must CONTAIN the candidate (not vice versa)
  // to avoid short headers (e.g. "Voucher") matching long candidates (e.g. "status voucher").
  // Require candidates to be at least 4 chars to avoid spurious single-word matches.
  for (const cand of normalizedCandidatos) {
    if (cand.length < 4) continue;
    const found = cabecalhos.find((h) => h.norm.includes(cand));
    if (found) return found.header;
  }

  return undefined;
}
