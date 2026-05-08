import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, ROLES_READ } from "@/lib/authz";
import { logAudit, getClientIp } from "@/lib/audit";
import * as XLSX from "xlsx";

interface Params {
  params: Promise<{ id: string }>;
}

type Categoria = "todas" | "grandes" | "convencionais";

export async function GET(req: Request, { params }: Params) {
  const auth = await requireRole(ROLES_READ);
  if (auth.error) return auth.error;

  const { id: faturamentoId } = await params;
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo"); // "funcional" | "proteus"
  const categoriaRaw = searchParams.get("categoria") ?? "todas";
  const categoria: Categoria =
    categoriaRaw === "grandes" || categoriaRaw === "convencionais" ? categoriaRaw : "todas";

  if (tipo !== "funcional" && tipo !== "proteus") {
    return NextResponse.json({ error: 'Parâmetro "tipo" inválido. Use "funcional" ou "proteus".' }, { status: 400 });
  }

  const faturamento = await prisma.faturamento.findUnique({
    where: { id: faturamentoId },
    select: { id: true, dataInicio: true, dataFechamento: true, status: true },
  });

  if (!faturamento) {
    return NextResponse.json({ error: "Faturamento não encontrado" }, { status: 404 });
  }

  const fmtFile = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}${d.getFullYear()}`;
  const periodo = `${fmtFile(faturamento.dataInicio)}_${fmtFile(faturamento.dataFechamento)}`;
  const sufixoCat =
    categoria === "grandes" ? "_GrandesRedes" : categoria === "convencionais" ? "_Convencionais" : "";

  await logAudit({
    userId: auth.session.user.id,
    action: "faturamento.export",
    entity: "Faturamento",
    entityId: faturamentoId,
    meta: { tipo, periodo, categoria },
    ip: getClientIp(req),
  });

  if (tipo === "funcional") {
    return gerarExportFuncional(faturamentoId, periodo + sufixoCat, categoria);
  }
  return gerarExportProteus(faturamentoId, periodo + sufixoCat, categoria);
}

/**
 * Builds the Prisma `where` clause for filtering by clinic category.
 * grandes        → only pedidos from clinicas marked as grandeRede
 * convencionais  → only pedidos from clinicas NOT marked as grandeRede (and unmatched)
 * todas          → no extra filter
 */
function buildCategoriaFilter(categoria: Categoria) {
  if (categoria === "grandes") return { clinica: { grandeRede: true } };
  if (categoria === "convencionais") {
    return {
      OR: [
        { clinica: { grandeRede: false } },
        { clinica: null },
      ],
    };
  }
  return {};
}

// ─── Planilha Funcional (vai para J&J com BR-A/DSP, sem PII) ─────────────────

async function gerarExportFuncional(faturamentoId: string, periodo: string, categoria: Categoria) {
  const pedidos = await prisma.pedido.findMany({
    where: {
      faturamentoId,
      excluido: false,
      ...buildCategoriaFilter(categoria),
    },
    orderBy: [{ clinicaId: "asc" }, { dataInfusao: "asc" }],
    include: { clinica: true, medicamento: true },
  });

  const linhas = pedidos.map((p) => ({
    "Voucher / Cód. Autorização": p.voucher,
    "ID Articulação":             p.articulacaoId ?? "",
    "Código Paciente (BR-A/DSP)": p.codigoPaciente,
    "Medicamento":                p.medicamento?.nomeCliente ?? "",
    "Serviço":                    p.servico ?? "",
    "Procedimento":               p.procedimento ?? "",
    "Procedimento Reclassificado": p.procedimentoReclassificado ?? "",
    "Data Infusão":               p.dataInfusao ? formatarData(p.dataInfusao) : "",
    "Data Finalização Voucher":   p.dataFinalizacaoVoucher ? formatarData(p.dataFinalizacaoVoucher) : "",
    "Data Faturamento":           p.dataFaturamento ? formatarData(p.dataFaturamento) : "",
    "AGE (dias)":                 p.ageDias ?? "",
    "Valor Unitário":             p.valorUnitario ? Number(p.valorUnitario) : "",
    "Valor Total Ordem":          p.valorTotalOrdem ? Number(p.valorTotalOrdem) : "",
    "Código Ordem Pagamento":     p.codigoOrdemPagamento ?? "",
    "Lote":                       p.lote ?? "",
    "Tipo (DSP/PSP)":             p.dsp ?? "",
    "Nº Nota Fiscal":             p.numeroNotaFiscal ?? "",
    "Data Envio NF":              p.dataEnvioNota ? formatarData(p.dataEnvioNota) : "",
    "Status Voucher":             p.statusVoucher ?? "",
    "Status Ordem":               p.statusOrdemPagamento ?? "",
    "CNPJ Clínica (Faturamento)": p.clinica?.cnpj ?? "",
    "Nome Clínica":               p.clinica?.nomeFantasia ?? p.clinica?.razaoSocial ?? "",
    "Categoria":                  p.clinica?.grandeRede ? "Grande Rede" : "Convencional",
    "Cidade":                     p.clinica?.cidade ?? "",
    "Estado":                     p.clinica?.estado ?? "",
    "Prazo Pagamento":            p.clinica?.prazoFaturamento ?? "",
  }));

  return montarResposta(linhas, `Funcional_JJ_${periodo}.xlsx`);
}

// ─── Planilha Proteus (formato da Talita / financeiro) ────────────────────────

async function gerarExportProteus(faturamentoId: string, periodo: string, categoria: Categoria) {
  const ordens = await prisma.ordemPagamento.findMany({
    where: {
      faturamentoId,
      ...buildCategoriaFilter(categoria),
    },
    orderBy: [{ cnpj: "asc" }, { codigoOrdem: "asc" }],
    include: { clinica: true },
  });

  const linhas = ordens.map((o) => ({
    "Código Ordem Pagamento":  o.codigoOrdem ?? "",
    "Nº Nota Fiscal":          o.numeroNotaFiscal ?? "",
    "Valor Total":             o.valorTotal ? Number(o.valorTotal) : "",
    "CNPJ":                    o.cnpj ?? "",
    "Razão Social":            o.razaoSocial ?? "",
    "Nome Fantasia":           o.clinica?.nomeFantasia ?? "",
    "Categoria":               o.clinica?.grandeRede ? "Grande Rede" : "Convencional",
    "Cidade":                  o.clinica?.cidade ?? "",
    "Estado":                  o.clinica?.estado ?? "",
    "Status":                  o.status ?? "",
    "Data Envio":              o.dataEnvio ? formatarData(o.dataEnvio) : "",
  }));

  return montarResposta(linhas, `Proteus_JJ_${periodo}.xlsx`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarData(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function montarResposta(linhas: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(linhas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
