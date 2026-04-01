/**
 * Parse de datas nos vários formatos encontrados nas planilhas.
 * Formatos:
 *  - Date object (já é Date)
 *  - "13/03/2026 09:47:31" (DD/MM/YYYY HH:mm:ss)
 *  - "13/03/2026 11:03" (DD/MM/YYYY HH:mm)
 *  - "13/03/2026" (DD/MM/YYYY)
 *  - Excel serial number
 */
export function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;

  // Já é Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Number (Excel serial)
  if (typeof value === "number") {
    // Excel serial date: dias desde 1900-01-01
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== "string") return null;

  const str = value.trim();

  // DD/MM/YYYY HH:mm:ss
  const fullMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (fullMatch) {
    const [, day, month, year, hours, minutes, seconds] = fullMatch;
    return new Date(+year!, +month! - 1, +day!, +hours!, +minutes!, +seconds!);
  }

  // DD/MM/YYYY HH:mm
  const shortTimeMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (shortTimeMatch) {
    const [, day, month, year, hours, minutes] = shortTimeMatch;
    return new Date(+year!, +month! - 1, +day!, +hours!, +minutes!);
  }

  // DD/MM/YYYY
  const dateOnlyMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dateOnlyMatch) {
    const [, day, month, year] = dateOnlyMatch;
    return new Date(+year!, +month! - 1, +day!);
  }

  // ISO format fallback
  const isoDate = new Date(str);
  return isNaN(isoDate.getTime()) ? null : isoDate;
}

/**
 * Calcula aging em dias entre duas datas
 */
export function calcAging(dataUtilizacao: Date | null, dataCorte: Date): number {
  if (!dataUtilizacao) return 0;
  const diffMs = dataCorte.getTime() - dataUtilizacao.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Formata data para exibição DD/MM/YYYY
 */
export function formatDateBR(date: Date | null): string {
  if (!date) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
