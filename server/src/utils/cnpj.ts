/**
 * Normaliza um CNPJ para 14 dígitos sem pontuação.
 * Aceita: number, string com/sem pontuação.
 * Ex: "51.873.297/0001-30" → "51873297000130"
 * Ex: 51873297000130 → "51873297000130"
 * Ex: 2391109000122 → "02391109000122"
 */
export function normalizeCnpj(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";

  const raw = String(value).replace(/[^\d]/g, "");
  return raw.padStart(14, "0");
}

/**
 * Formata um CNPJ para exibição: XX.XXX.XXX/XXXX-XX
 */
export function formatCnpj(cnpj: string): string {
  const clean = normalizeCnpj(cnpj);
  if (clean.length !== 14) return clean;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
}

/**
 * Compara dois CNPJs normalizados
 */
export function cnpjsMatch(a: string | number | null | undefined, b: string | number | null | undefined): boolean {
  const na = normalizeCnpj(a);
  const nb = normalizeCnpj(b);
  if (!na || !nb) return false;
  return na === nb;
}
