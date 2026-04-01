import { PrismaClient } from "@prisma/client";
import { cnpjsMatch } from "../utils/cnpj.js";

const prisma = new PrismaClient();

interface ReconciliationSummary {
  totalConsistentes: number;
  totalDivergentes: number;
  totalSemMatchProteus: number;
  totalSemMatchAutorizador: number;
  divergenciasPorTipo: {
    valor: number;
    cnpj: number;
    razao: number;
  };
}

/**
 * Fuzzy match simples para razão social.
 * Normaliza e compara as primeiras palavras significativas.
 */
function razaoSocialMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;

  const normalize = (s: string) =>
    s
      .toUpperCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      // Remove sufixos comuns
      .replace(/\s*(LTDA|S\/?A|S\/S|ME|EPP|EIRELI|SERVICOS? MEDICOS?)\s*/g, " ")
      .trim();

  const na = normalize(a);
  const nb = normalize(b);

  // Match exato
  if (na === nb) return true;

  // Um contém o outro
  if (na.includes(nb) || nb.includes(na)) return true;

  // Compara primeiras 3 palavras
  const wordsA = na.split(" ").slice(0, 3).join(" ");
  const wordsB = nb.split(" ").slice(0, 3).join(" ");
  return wordsA === wordsB;
}

export async function runReconciliation(
  batchId: string
): Promise<ReconciliationSummary> {
  // Limpa resultados anteriores
  await prisma.reconciliationResult.deleteMany({ where: { batchId } });

  // Busca registros trabalhados (com NF)
  const autorizadorRecords = await prisma.autorizadorRecord.findMany({
    where: {
      batchId,
      classificacao: "trabalhada",
      numNotaFiscal: { not: null },
    },
  });

  // Busca todos os registros do Proteus
  const proteusRecords = await prisma.proteusRecord.findMany({
    where: { batchId },
  });

  // Indexa Proteus por NF Original
  const proteusByNF = new Map<string, typeof proteusRecords>();
  for (const pr of proteusRecords) {
    const nf = pr.nfOriginal.replace(/^0+/, ""); // Remove zeros à esquerda
    if (!proteusByNF.has(nf)) {
      proteusByNF.set(nf, []);
    }
    proteusByNF.get(nf)!.push(pr);
  }

  const results: Parameters<typeof prisma.reconciliationResult.create>[0]["data"][] = [];
  const matchedNFs = new Set<string>();

  let totalConsistentes = 0;
  let totalDivergentes = 0;
  let totalSemMatchProteus = 0;
  let totalSemMatchAutorizador = 0;
  const divergenciasPorTipo = { valor: 0, cnpj: 0, razao: 0 };

  // Agrupa autorizador por NF (pode ter múltiplos vouchers por NF)
  const autByNF = new Map<string, typeof autorizadorRecords>();
  for (const ar of autorizadorRecords) {
    const nf = (ar.numNotaFiscal || "").replace(/^0+/, "");
    if (!nf) continue;
    if (!autByNF.has(nf)) {
      autByNF.set(nf, []);
    }
    autByNF.get(nf)!.push(ar);
  }

  // Concilia por NF
  for (const [nf, autRecords] of autByNF.entries()) {
    const proteusMatches = proteusByNF.get(nf);
    matchedNFs.add(nf);

    if (!proteusMatches || proteusMatches.length === 0) {
      // NF do Autorizador sem match no Proteus
      for (const ar of autRecords) {
        totalSemMatchProteus++;
        results.push({
          batchId,
          numNotaFiscal: nf,
          voucher: ar.voucher,
          codOrdemPagamento: ar.codOrdemPagamento,
          status: "sem_match_proteus",
          valorAutorizador: ar.valorTotalOrdemPagamento || ar.valor,
          cnpjAutorizador: ar.cnpjFaturamento,
          razaoAutorizador: ar.nomeDaClinica,
        });
      }
      continue;
    }

    // Tem match - compara valores agregados
    const valorAut = autRecords.reduce(
      (sum, r) => sum + Number(r.valorTotalOrdemPagamento || r.valor),
      0
    );
    const valorPro = proteusMatches.reduce(
      (sum, r) => sum + Number(r.vlrTotal),
      0
    );
    const cnpjAut = autRecords[0]!.cnpjFaturamento;
    const cnpjPro = proteusMatches[0]!.cnpj;
    const razaoAut = autRecords[0]!.nomeDaClinica;
    const razaoPro = proteusMatches[0]!.rzSocial;

    const bateValor = Math.abs(valorAut - valorPro) < 0.01;
    const bateCnpj = cnpjsMatch(cnpjAut, cnpjPro);
    const bateRazao = razaoSocialMatch(razaoAut, razaoPro);

    let status = "consistente";
    if (!bateValor || !bateCnpj || !bateRazao) {
      status = !bateValor
        ? "divergente_valor"
        : !bateCnpj
          ? "divergente_cnpj"
          : "divergente_razao";
      totalDivergentes++;
      if (!bateValor) divergenciasPorTipo.valor++;
      if (!bateCnpj) divergenciasPorTipo.cnpj++;
      if (!bateRazao) divergenciasPorTipo.razao++;
    } else {
      totalConsistentes++;
    }

    results.push({
      batchId,
      numNotaFiscal: nf,
      voucher: autRecords[0]!.voucher,
      codOrdemPagamento: autRecords[0]!.codOrdemPagamento,
      status,
      valorAutorizador: valorAut,
      valorProteus: valorPro,
      bateValor,
      cnpjAutorizador: cnpjAut,
      cnpjProteus: cnpjPro,
      bateCnpj,
      razaoAutorizador: razaoAut,
      razaoProteus: razaoPro,
      bateRazao,
    });
  }

  // NFs do Proteus sem match no Autorizador
  for (const [nf, proteusRecs] of proteusByNF.entries()) {
    if (!matchedNFs.has(nf)) {
      totalSemMatchAutorizador++;
      const pr = proteusRecs[0]!;
      results.push({
        batchId,
        numNotaFiscal: nf,
        status: "sem_match_autorizador",
        valorProteus: pr.vlrTotal,
        cnpjProteus: pr.cnpj,
        razaoProteus: pr.rzSocial,
      });
    }
  }

  // Insere em batches
  const BATCH_SIZE = 500;
  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const chunk = results.slice(i, i + BATCH_SIZE);
    await prisma.reconciliationResult.createMany({ data: chunk });
  }

  // Atualiza status do batch
  await prisma.faturamentoBatch.update({
    where: { id: batchId },
    data: { status: "conciliado" },
  });

  return {
    totalConsistentes,
    totalDivergentes,
    totalSemMatchProteus,
    totalSemMatchAutorizador,
    divergenciasPorTipo,
  };
}
