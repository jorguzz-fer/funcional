import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, ROLES_WRITE } from "@/lib/authz";
import { logAudit, getClientIp } from "@/lib/audit";
import {
  validarUploadFaturamento,
  lerArquivosUpload,
  registrosUpload,
  dispararPipeline,
  processamentoEmAndamento,
  type ArquivosLidos,
} from "@/lib/faturamento/upload";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * Reprocessa um faturamento existente com novas planilhas
 * ("substituir planilhas").
 *
 * Mantém o mesmo registro (id) e permite ajustar o período. Todos os dados
 * derivados do processamento anterior — pedidos, ordens, conciliações,
 * divergências (inclusive as já resolvidas) e uploads — são descartados e o
 * pipeline roda de novo com as planilhas enviadas. É o caminho para corrigir
 * uma conciliação feita com planilha errada sem precisar excluir e recriar o
 * período.
 */
export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const auth = await requireRole(ROLES_WRITE);
  if (auth.error) return auth.error;
  const { session } = auth;

  const { id } = await params;

  const faturamento = await prisma.faturamento.findUnique({
    where: { id },
    select: {
      id: true,
      dataInicio: true,
      dataFechamento: true,
      programa: true,
      status: true,
      updatedAt: true,
      uploads: { select: { erros: true } },
    },
  });

  if (!faturamento) {
    return NextResponse.json({ error: "Faturamento não encontrado" }, { status: 404 });
  }

  if (processamentoEmAndamento(faturamento)) {
    return NextResponse.json(
      { error: "As planilhas deste faturamento ainda estão sendo processadas. Aguarde a conclusão para reprocessar." },
      { status: 409 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Requisição inválida: não é multipart/form-data" },
      { status: 400 },
    );
  }

  const validacao = validarUploadFaturamento(formData);
  if (validacao.error) return validacao.error;
  const { autorizadorFile, proteusFile, dataInicio, dataFechamento, programa } = validacao.dados;

  // O período e o programa podem ser ajustados livremente: vários
  // faturamentos coexistem na mesma competência.

  // Lê os arquivos ANTES de descartar qualquer coisa: se a leitura falhar,
  // o faturamento atual permanece intacto.
  let arquivos: ArquivosLidos;
  try {
    arquivos = await lerArquivosUpload(autorizadorFile, proteusFile);
  } catch {
    return NextResponse.json({ error: "Erro ao ler arquivos" }, { status: 500 });
  }

  // Descarta os dados do processamento anterior e registra os novos uploads —
  // tudo ou nada.
  await prisma.$transaction([
    prisma.divergencia.deleteMany({ where: { faturamentoId: id } }),
    prisma.conciliacao.deleteMany({ where: { faturamentoId: id } }),
    prisma.pedido.deleteMany({ where: { faturamentoId: id } }),
    prisma.ordemPagamento.deleteMany({ where: { faturamentoId: id } }),
    prisma.uploadArquivo.deleteMany({ where: { faturamentoId: id } }),
    prisma.faturamento.update({
      where: { id },
      data: { dataInicio, dataFechamento, programa, status: "RASCUNHO" },
    }),
    prisma.uploadArquivo.createMany({ data: registrosUpload(id, arquivos) }),
  ]);

  dispararPipeline(id, arquivos);

  await logAudit({
    userId: session.user!.id as string,
    action: "faturamento.reprocessar",
    entity: "Faturamento",
    entityId: id,
    meta: {
      periodoAnterior: {
        dataInicio: faturamento.dataInicio.toISOString(),
        dataFechamento: faturamento.dataFechamento.toISOString(),
      },
      statusAnterior: faturamento.status,
      programaAnterior: faturamento.programa,
      dataInicio: dataInicio.toISOString(),
      dataFechamento: dataFechamento.toISOString(),
      programa,
      autorizador: autorizadorFile.name,
      proteus: proteusFile.name,
    },
    ip: getClientIp(req),
  });

  return NextResponse.json({ id }, { status: 200 });
}
