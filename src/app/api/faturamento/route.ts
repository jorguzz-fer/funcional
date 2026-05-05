import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { requireRole, ROLES_WRITE } from "@/lib/authz";
import { logAudit, getClientIp } from "@/lib/audit";
import { processarFaturamento } from "@/lib/pipeline/processarFaturamento";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

function getExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length < 2) return "";
  return "." + parts[parts.length - 1].toLowerCase();
}

function isAllowedExtension(filename: string): boolean {
  return ALLOWED_EXTENSIONS.includes(getExtension(filename));
}

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

  const autorizadorFile = formData.get("autorizador");
  const proteusFile = formData.get("proteus");
  const mesStr = formData.get("mes");
  const anoStr = formData.get("ano");

  // 3. Validate required fields
  if (!autorizadorFile || !(autorizadorFile instanceof File)) {
    return NextResponse.json({ error: "Campo 'autorizador' é obrigatório" }, { status: 400 });
  }
  if (!proteusFile || !(proteusFile instanceof File)) {
    return NextResponse.json({ error: "Campo 'proteus' é obrigatório" }, { status: 400 });
  }
  if (!mesStr || !anoStr) {
    return NextResponse.json(
      { error: "Campos 'mes' e 'ano' são obrigatórios" },
      { status: 400 },
    );
  }

  const mes = parseInt(String(mesStr), 10);
  const ano = parseInt(String(anoStr), 10);

  if (isNaN(mes) || mes < 1 || mes > 12) {
    return NextResponse.json({ error: "Mês inválido (deve ser 1-12)" }, { status: 400 });
  }
  if (isNaN(ano) || ano < 2000 || ano > 2100) {
    return NextResponse.json({ error: "Ano inválido" }, { status: 400 });
  }

  // Validate extensions
  if (!isAllowedExtension(autorizadorFile.name)) {
    return NextResponse.json(
      {
        error: `Arquivo autorizador com extensão inválida. Permitido: ${ALLOWED_EXTENSIONS.join(", ")}`,
      },
      { status: 400 },
    );
  }
  if (!isAllowedExtension(proteusFile.name)) {
    return NextResponse.json(
      {
        error: `Arquivo proteus com extensão inválida. Permitido: ${ALLOWED_EXTENSIONS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Validate file sizes
  if (autorizadorFile.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Arquivo autorizador excede o limite de 50MB" },
      { status: 400 },
    );
  }
  if (proteusFile.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Arquivo proteus excede o limite de 50MB" },
      { status: 400 },
    );
  }

  // Check for existing faturamento for the same mes/ano
  const existing = await prisma.faturamento.findUnique({
    where: { mesReferencia_anoReferencia: { mesReferencia: mes, anoReferencia: ano } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: `Já existe um faturamento registrado para ${mes}/${ano}`,
        existingId: existing.id,
      },
      { status: 409 },
    );
  }

  // 4. Save files to disk under ./uploads/<uuid>/
  const uploadId = randomUUID();
  const uploadDir = join(process.cwd(), "uploads", uploadId);

  try {
    await mkdir(uploadDir, { recursive: true });
  } catch {
    return NextResponse.json({ error: "Erro ao criar diretório de upload" }, { status: 500 });
  }

  const autorizadorExt = getExtension(autorizadorFile.name);
  const proteusExt = getExtension(proteusFile.name);

  const autorizadorPath = join(uploadDir, `autorizador${autorizadorExt}`);
  const proteusPath = join(uploadDir, `proteus${proteusExt}`);

  try {
    const [autorizadorBuffer, proteusBuffer] = await Promise.all([
      autorizadorFile.arrayBuffer(),
      proteusFile.arrayBuffer(),
    ]);

    await Promise.all([
      writeFile(autorizadorPath, Buffer.from(autorizadorBuffer)),
      writeFile(proteusPath, Buffer.from(proteusBuffer)),
    ]);
  } catch {
    return NextResponse.json({ error: "Erro ao salvar arquivos" }, { status: 500 });
  }

  // Placeholder dataFechamento: 15th of the reference month
  const dataFechamento = new Date(Date.UTC(ano, mes - 1, 15));

  // 5. Create Faturamento record (status RASCUNHO)
  const faturamento = await prisma.faturamento.create({
    data: {
      mesReferencia: mes,
      anoReferencia: ano,
      dataFechamento,
      status: "RASCUNHO",
    },
  });

  // 6. Create UploadArquivo records
  await prisma.uploadArquivo.createMany({
    data: [
      {
        faturamentoId: faturamento.id,
        tipo: "AUTORIZADOR",
        nomeOriginal: autorizadorFile.name,
        caminho: autorizadorPath,
        tamanhoBytes: autorizadorFile.size,
        processado: false,
      },
      {
        faturamentoId: faturamento.id,
        tipo: "PROTEUS",
        nomeOriginal: proteusFile.name,
        caminho: proteusPath,
        tamanhoBytes: proteusFile.size,
        processado: false,
      },
    ],
  });

  // 7. Fire-and-forget pipeline
  processarFaturamento(faturamento.id).catch((err) => {
    console.error(`[api/faturamento] Erro no pipeline para ${faturamento.id}:`, err);
  });

  // 8. Audit log
  await logAudit({
    userId: session!.user!.id as string,
    action: "faturamento.create",
    entity: "Faturamento",
    entityId: faturamento.id,
    meta: {
      mes,
      ano,
      autorizador: autorizadorFile.name,
      proteus: proteusFile.name,
    },
    ip: getClientIp(req),
  });

  // 9. Return 201
  return NextResponse.json({ id: faturamento.id }, { status: 201 });
}
