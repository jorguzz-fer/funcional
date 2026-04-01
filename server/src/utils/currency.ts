/**
 * Normaliza um valor monetário para number.
 * Aceita: number, string com vírgula/ponto, etc.
 */
export function normalizeValue(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;

  const str = String(value).trim();

  // Remove R$, espaços
  let clean = str.replace(/R\$\s*/g, "").trim();

  // Formato brasileiro: 1.234,56 → 1234.56
  if (clean.includes(",") && clean.includes(".")) {
    // Se a vírgula vem depois do ponto: 1.234,56 (BR)
    if (clean.lastIndexOf(",") > clean.lastIndexOf(".")) {
      clean = clean.replace(/\./g, "").replace(",", ".");
    }
    // Se o ponto vem depois da vírgula: 1,234.56 (EN) — já está ok
    else {
      clean = clean.replace(/,/g, "");
    }
  } else if (clean.includes(",")) {
    // Só vírgula: pode ser decimal (220,50) ou milhar (1,234)
    // Se tem exatamente 2 dígitos após vírgula, tratar como decimal
    const parts = clean.split(",");
    if (parts[1] && parts[1].length <= 2) {
      clean = clean.replace(",", ".");
    } else {
      clean = clean.replace(/,/g, "");
    }
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Formata valor para exibição em BRL
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
