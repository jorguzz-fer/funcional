import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";
import { normalizeCnpj } from "../utils/cnpj.js";
import { parseDate } from "../utils/dates.js";
import { normalizeValue } from "../utils/currency.js";

const prisma = new PrismaClient();

interface ProcessResult {
  totalRegistros: number;
  valorTotal: number;
}

export async function processProteus(
  filePath: string,
  batchId: string
): Promise<ProcessResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // Busca a aba de itens de notas (nome pode variar)
  let sheet = workbook.worksheets.find((ws) =>
    ws.name.toLowerCase().includes("itens de notas")
  );

  // Fallback: pega a segunda aba (primeira é Parametros)
  if (!sheet && workbook.worksheets.length > 1) {
    sheet = workbook.worksheets[1];
  }

  if (!sheet) {
    throw new Error(
      "Aba de Itens de Notas Fiscais não encontrada na planilha do Proteus"
    );
  }

  const records: Array<{
    data: Parameters<typeof prisma.proteusRecord.create>[0]["data"];
  }> = [];
  let totalRegistros = 0;
  let valorTotal = 0;

  // Header na linha 1
  // Colunas: Documento | NF Original | Serie | Produto | Quantidade | Vlr.Unitario | Vlr.Total |
  //          Cod.For/Cli | Loja | Rz.Social | CNPJ/CPF | Dt.Dig. | TES | Custo Moeda1 |
  //          Centro Custo | Item Conta | Cod Cl Val
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const getValue = (col: number) => row.getCell(col).value;

    const documento = String(getValue(1) || "").trim();
    const nfOriginal = String(getValue(2) || "").trim();

    // Pula linhas sem documento
    if (!documento && !nfOriginal) return;

    totalRegistros++;

    const vlrTotal = normalizeValue(getValue(7));
    valorTotal += vlrTotal;

    records.push({
      data: {
        batchId,
        documento,
        nfOriginal,
        serie: String(getValue(3) || "") || null,
        produto: String(getValue(4) || ""),
        descricao: String(getValue(5) || "") || null,
        quantidade: Number(getValue(5)) || null,
        vlrUnitario: normalizeValue(getValue(6)),
        vlrTotal,
        codForCli: String(getValue(8) || "") || null,
        loja: String(getValue(9) || "") || null,
        rzSocial: String(getValue(10) || "") || null,
        cnpj: normalizeCnpj(getValue(11) as string | number),
        dtDigitacao: parseDate(getValue(12)),
        tes: String(getValue(13) || "") || null,
        custoMoeda1: normalizeValue(getValue(14)) || null,
        centroCusto: String(getValue(15) || "") || null,
        itemConta: String(getValue(16) || "") || null,
        codClVal: String(getValue(17) || "") || null,
      },
    });
  });

  // Insere em batch
  if (records.length > 0) {
    await prisma.proteusRecord.createMany({
      data: records.map((r) => r.data),
    });
  }

  return {
    totalRegistros,
    valorTotal,
  };
}
