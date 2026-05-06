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
 * Parses a currency/decimal value.
 * Accepts:
 *  - JS number → returned as-is
 *  - String "1.234,56" (Brazilian) or "1234.56" (international)
 * Returns 0 when parsing fails or the value is blank.
 */
export function parsearValor(raw: unknown): number {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "number") return isNaN(raw) ? 0 : raw;

  if (typeof raw === "string") {
    const s = raw.trim();
    if (s === "") return 0;

    // Brazilian format: "1.234,56" → "1234.56"
    const brFormat = s.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(brFormat);
    return isNaN(n) ? 0 : n;
  }

  return 0;
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
 * Finds the first header string that fuzzy-matches one of the given candidates.
 * Matching is done via normalizarTexto so accents, case, and surrounding spaces
 * are ignored. Also tries substring containment as a fallback.
 */
export function encontrarColuna(headers: string[], candidatos: string[]): string | undefined {
  const normalizedCandidatos = candidatos.map(normalizarTexto);

  // Exact normalized match
  for (const header of headers) {
    const norm = normalizarTexto(header);
    if (normalizedCandidatos.includes(norm)) {
      return header;
    }
  }

  // Substring containment: the header must CONTAIN the candidate (not vice versa)
  // to avoid short headers (e.g. "Voucher") matching long candidates (e.g. "status voucher").
  // Require candidates to be at least 4 chars to avoid spurious single-word matches.
  for (const header of headers) {
    const norm = normalizarTexto(header);
    for (const cand of normalizedCandidatos) {
      if (cand.length >= 4 && norm.includes(cand)) {
        return header;
      }
    }
  }

  return undefined;
}
