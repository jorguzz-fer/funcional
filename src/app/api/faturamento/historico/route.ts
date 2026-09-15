import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireRole, ROLES_READ } from "@/lib/authz";
import { logAudit, getClientIp } from "@/lib/audit";
import { carregarHistorico, parseFiltrosHistorico } from "@/lib/faturamento/historico";

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO:   "Rascunho",
  EM_REVISAO: "Em Revisão",
  CONCILIADO: "Conciliado",
  EXPORTADO:  "Exportado",
  CONCLUIDO:  "Concluído",
};

function formatarData(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

function formatarDataHora(d: Date): string {
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/**
 * Exporta o histórico de faturamentos (com os mesmos filtros da tela) em xlsx,
 * uma linha por faturamento com os agregados de conciliação — para consulta e
 * auditoria fora do sistema.
 */
export async function GET(req: Request) {
  const auth = await requireRole(ROLES_READ);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const filtros = parseFiltrosHistorico(searchParams);
  const linhas = await carregarHistorico(filtros);

  const dados = linhas.map((l) => ({
    "Programa":                l.programa ?? "",
    "Data Início":             formatarData(l.dataInicio),
    "Data Fechamento":         formatarData(l.dataFechamento),
    "Status":                  STATUS_LABEL[l.status] ?? l.status,
    "Criado em":               formatarDataHora(l.createdAt),
    "Pedidos (total)":         l.pedidosTotal,
    "Pedidos válidos":         l.pedidosValidos,
    "Pedidos excluídos":       l.pedidosExcluidos,
    "Aguardando NF":           l.aguardandoNF,
    "Divergências pendentes":  l.divergenciasPendentes,
    "Divergências resolvidas": l.divergenciasResolvidas,
    "Valor Autorizador (R$)":  Number(l.valorAutorizador.toFixed(2)),
    "Valor Proteus (R$)":      Number(l.valorProteus.toFixed(2)),
    "ID":                      l.id,
  }));

  await logAudit({
    userId: auth.session.user.id,
    action: "faturamento.historico.export",
    entity: "Faturamento",
    entityId: null,
    meta: { filtros, registros: linhas.length },
    ip: getClientIp(req),
  });

  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Histórico");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const hoje = new Date();
  const carimbo = `${hoje.getUTCFullYear()}${String(hoje.getUTCMonth() + 1).padStart(2, "0")}${String(hoje.getUTCDate()).padStart(2, "0")}`;
  const sufixo = filtros.ano ? `_${filtros.ano}` : "";

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Historico_Faturamentos${sufixo}_${carimbo}.xlsx"`,
    },
  });
}
