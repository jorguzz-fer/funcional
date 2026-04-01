import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";
import { normalizeCnpj } from "../utils/cnpj.js";
import { parseDate, calcAging } from "../utils/dates.js";
import { normalizeValue } from "../utils/currency.js";

const prisma = new PrismaClient();

// Mapeamento de procedimentos para reclassificação J&J
const RECLASSIFICACAO: Record<string, string> = {
  "infusão de remicade": "Remicade",
  "infusão de stelara": "Stelara",
  "aplicação de simponi sc": "Simponi",
  "aplicação de tremfya": "Tremfya",
  "aplicação de simponi iv": "Simponi IV",
};

// Statuses que devem ser excluídos
const STATUS_EXCLUIR = [
  "glosado",
  "cancelado",
  "faturado",
  "enviado para faturamento",
];

interface ProcessResult {
  totalOriginal: number;
  totalTrabalhada: number;
  totalVazias: number;
  totalForaAging: number;
  totalExcluidas: number;
  valorTotalFaturar: number;
}

export async function processAutorizador(
  filePath: string,
  batchId: string
): Promise<ProcessResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // Busca a aba ORIGINAL
  const sheet = workbook.getWorksheet("ORIGINAL");
  if (!sheet) {
    throw new Error('Aba "ORIGINAL" não encontrada na planilha do Autorizador');
  }

  const dataCorte = new Date(); // Data de corte para aging
  const records: Array<{
    data: Parameters<typeof prisma.autorizadorRecord.create>[0]["data"];
  }> = [];

  let totalOriginal = 0;
  let totalTrabalhada = 0;
  let totalVazias = 0;
  let totalForaAging = 0;
  let totalExcluidas = 0;
  let valorTotalFaturar = 0;

  // Header na linha 1
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    totalOriginal++;

    const getValue = (col: number) => row.getCell(col).value;

    const servico = String(getValue(1) || "");
    const procedimento = String(getValue(2) || "");
    const procedimentoReclassificacao =
      String(getValue(3) || "") ||
      RECLASSIFICACAO[procedimento.toLowerCase()] ||
      procedimento;
    const dataEnvioJanssen = parseDate(getValue(4));
    const mesReferencia = String(getValue(5) || "");
    const nomeDaClinica = String(getValue(6) || "");
    const cnpjFaturamento = normalizeCnpj(getValue(7) as string | number);
    const cidade = String(getValue(8) || "");
    const uf = String(getValue(9) || "");
    const prazoPagamento = Number(getValue(10)) || 30;
    const numNotaFiscal = String(getValue(11) || "").trim();
    const dataEnvioNF = parseDate(getValue(12));
    const dataUtilizacao = parseDate(getValue(13));
    const codigoPaciente = String(getValue(14) || "");
    const voucher = Number(getValue(15)) || 0;
    const lote = String(getValue(16) || "");
    const valor = normalizeValue(getValue(17));
    const dspPsp = String(getValue(18) || "");
    const valorTotalOrdemPagamento = normalizeValue(getValue(19));
    const codOrdemPagamento = Number(getValue(20)) || null;
    const idPedido = Number(getValue(21)) || null;
    const nomeExame = String(getValue(22) || "");
    const dataFinalizacao = parseDate(getValue(23));
    const dtEmissaoNF = parseDate(getValue(24));
    const cnpjCredenciado = normalizeCnpj(getValue(25) as string | number);
    const nomeFantasia = String(getValue(26) || "");
    const cidadeCredenciado = String(getValue(27) || "");
    const ufCredenciado = String(getValue(28) || "");
    const statusOrdemPagamento = String(getValue(29) || "");
    const dataInfusao = parseDate(getValue(30));
    const statusPedido = String(getValue(31) || "");
    const dataFaturamento = parseDate(getValue(32));
    const aging = Number(getValue(33)) || calcAging(dataUtilizacao, dataCorte);

    // Classificação
    let classificacao = "trabalhada";

    // 1. Verifica status para exclusão
    if (
      STATUS_EXCLUIR.some(
        (s) =>
          statusOrdemPagamento.toLowerCase().includes(s) ||
          statusPedido.toLowerCase().includes(s)
      )
    ) {
      classificacao = "excluida";
      totalExcluidas++;
    }
    // 2. Verifica aging
    else if (aging > 90) {
      classificacao = "fora_aging";
      totalForaAging++;
    }
    // 3. Verifica se tem NF
    else if (!numNotaFiscal || numNotaFiscal === "" || numNotaFiscal === "0") {
      classificacao = "vazia";
      totalVazias++;
    }
    // 4. Válido para faturamento
    else {
      totalTrabalhada++;
      valorTotalFaturar += valor;
    }

    records.push({
      data: {
        batchId,
        servico,
        procedimento: procedimento || null,
        procedimentoReclassificacao: procedimentoReclassificacao || null,
        dataEnvioJanssen,
        mesReferencia: mesReferencia || null,
        nomeDaClinica: nomeDaClinica || null,
        cnpjFaturamento,
        cidade: cidade || null,
        uf: uf || null,
        prazoPagamento,
        numNotaFiscal: numNotaFiscal || null,
        dataEnvioNF,
        dataUtilizacao,
        codigoPaciente: codigoPaciente || null,
        voucher,
        lote: lote || null,
        valor,
        dspPsp: dspPsp || null,
        valorTotalOrdemPagamento: valorTotalOrdemPagamento || null,
        codOrdemPagamento,
        idPedido,
        nomeExame: nomeExame || null,
        dataFinalizacao,
        dtEmissaoNF,
        cnpjCredenciado: cnpjCredenciado || null,
        nomeFantasia: nomeFantasia || null,
        cidadeCredenciado: cidadeCredenciado || null,
        ufCredenciado: ufCredenciado || null,
        statusOrdemPagamento: statusOrdemPagamento || null,
        dataInfusao,
        statusPedido: statusPedido || null,
        dataFaturamento,
        aging,
        classificacao,
      },
    });
  });

  // Insere em batches de 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    await prisma.autorizadorRecord.createMany({
      data: chunk.map((r) => r.data),
    });
  }

  return {
    totalOriginal,
    totalTrabalhada,
    totalVazias,
    totalForaAging,
    totalExcluidas,
    valorTotalFaturar,
  };
}
