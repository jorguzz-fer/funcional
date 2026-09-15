import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, ROLES_WRITE } from "@/lib/authz";
import { logAudit, getClientIp } from "@/lib/audit";
import {
  validarUploadFaturamento,
  lerArquivosUpload,
  registrosUpload,
  dispararPipeline,
  type ArquivosLidos,
} from "@/lib/faturamento/upload";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth check
  const auth = await requireRole(ROLES_WRITE);
  if (auth.error) return auth.error;
  const { session } = auth;

  // 2. Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Requisição inválida: não é multipart/form-data" },
      { status: 400 },
    );
  }

  // 3. Validate required fields, dates, extensions and sizes
  const validacao = validarUploadFaturamento(formData);
  if (validacao.error) return validacao.error;
  const { autorizadorFile, proteusFile, dataInicio, dataFechamento, programa } = validacao.dados;

  // Vários faturamentos podem coexistir na mesma competência (PSP, DSP, Remi
  // Card…) — não há bloqueio por período. O rótulo "programa" os distingue.

  // 4. Read files into memory (+ best-effort backup on disk)
  let arquivos: ArquivosLidos;
  try {
    arquivos = await lerArquivosUpload(autorizadorFile, proteusFile);
  } catch {
    return NextResponse.json({ error: "Erro ao ler arquivos" }, { status: 500 });
  }

  // 5. Create Faturamento record (status RASCUNHO)
  const faturamento = await prisma.faturamento.create({
    data: {
      dataInicio,
      dataFechamento,
      programa,
      status: "RASCUNHO",
    },
  });

  // 6. Create UploadArquivo records
  await prisma.uploadArquivo.createMany({
    data: registrosUpload(faturamento.id, arquivos),
  });

  // 7. Fire-and-forget pipeline — passes in-memory buffers to avoid disk read issues.
  dispararPipeline(faturamento.id, arquivos);

  // 8. Audit log
  await logAudit({
    userId: session!.user!.id as string,
    action: "faturamento.create",
    entity: "Faturamento",
    entityId: faturamento.id,
    meta: {
      dataInicio: dataInicio.toISOString(),
      dataFechamento: dataFechamento.toISOString(),
      programa,
      autorizador: autorizadorFile.name,
      proteus: proteusFile.name,
    },
    ip: getClientIp(req),
  });

  // 9. Return 201
  return NextResponse.json({ id: faturamento.id }, { status: 201 });
}
