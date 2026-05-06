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

function parseLocalDate(dateStr: string): Date | null {
  // dateStr is YYYY-MM-DD from <input type="date">; treat as noon UTC to avoid timezone drift
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
  return isNaN(d.getTime()) ? null : d;
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
  const dataInicioStr = formData.get("dataInicio");
  const dataFimStr = formData.get("dataFim");

  // 3. Validate required fields
  if (!autorizadorFile || !(autorizadorFile instanceof File)) {
    return NextResponse.json({ error: "Campo 'autorizador' é obrigatório" }, { status: 400 });
  }
  if (!proteusFile || !(proteusFile instanceof File)) {
    return NextResponse.json({ error: "Campo 'proteus' é obrigatório" }, { status: 400 });
  }
  if (!dataInicioStr || !dataFimStr) {
    return NextResponse.json(
      { error: "Campos 'dataInicio' e 'dataFim' são obrigatórios" },
      { status: 400 },
    );
  }

  const dataInicio = parseLocalDate(String(dataInicioStr));
  const dataFechamento = parseLocalDate(String(dataFimStr));

  if (!dataInicio) {
    return NextResponse.json({ error: "Data de início inválida" }, { status: 400 });
  }
  if (!dataFechamento) {
    return NextResponse.json({ error: "Data de fechamento inválida" }, { status: 400 });
  }
  if (dataInicio > dataFechamento) {
    return NextResponse.json(
      { error: "A data de início deve ser anterior à data de fechamento" },
      { status: 400 },
    );
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

  // Check for existing faturamento for the same period
  const existing = await prisma.faturamento.findUnique({
    where: { dataInicio_dataFechamento: { dataInicio, dataFechamento } },
    select: { id: true },
  });
  if (existing) {
    const fmt = (d: Date) => d.toLocaleDateString("pt-BR");
    return NextResponse.json(
      {
        error: `Já existe um faturamento registrado para o período ${fmt(dataInicio)} — ${fmt(dataFechamento)}`,
        existingId: existing.id,
      },
      { status: 409 },
    );
  }

  // 4. Save files to disk under /tmp/uploads/<uuid>/
  // /tmp is always writable in Docker containers, unlike /app which may be read-only.
  const uploadId = randomUUID();
  const uploadDir = join("/tmp", "uploads", uploadId);

  try {
    await mkdir(uploadDir, { recursive: true });
  } catch {
    return NextResponse.json({ error: "Erro ao criar diretório de upload" }, { status: 500 });
  }

  const autorizadorExt = getExtension(autorizadorFile.name);
  const proteusExt = getExtension(proteusFile.name);

  const autorizadorPath = join(uploadDir, `autorizador${autorizadorExt}`);
  const proteusPath = join(uploadDir, `proteus${proteusExt}`);

  // Read file contents into memory — used both for disk backup and in-memory pipeline.
  let autorizadorBuf: Buffer;
  let proteusBuf: Buffer;
  try {
    const [autorizadorArrayBuffer, proteusArrayBuffer] = await Promise.all([
      autorizadorFile.arrayBuffer(),
      proteusFile.arrayBuffer(),
    ]);
    autorizadorBuf = Buffer.from(autorizadorArrayBuffer);
    proteusBuf = Buffer.from(proteusArrayBuffer);

    // Write to disk as backup (best-effort; pipeline does NOT read from disk).
    await Promise.all([
      writeFile(autorizadorPath, autorizadorBuf),
      writeFile(proteusPath, proteusBuf),
    ]).catch(() => {
      // Disk write failure is non-fatal: pipeline uses in-memory buffers.
      console.warn(`[api/faturamento] Backup em disco falhou para uploadDir=${uploadDir}`);
    });
  } catch {
    return NextResponse.json({ error: "Erro ao ler arquivos" }, { status: 500 });
  }

  // 5. Create Faturamento record (status RASCUNHO)
  const faturamento = await prisma.faturamento.create({
    data: {
      dataInicio,
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

  // 7. Fire-and-forget pipeline — passes in-memory buffers to avoid disk read issues.
  processarFaturamento(faturamento.id, {
    autorizador: autorizadorBuf,
    proteus: proteusBuf,
  }).catch((err) => {
    console.error(`[api/faturamento] Erro no pipeline para ${faturamento.id}:`, err);
  });

  // 8. Audit log
  await logAudit({
    userId: session!.user!.id as string,
    action: "faturamento.create",
    entity: "Faturamento",
    entityId: faturamento.id,
    meta: {
      dataInicio: dataInicio.toISOString(),
      dataFechamento: dataFechamento.toISOString(),
      autorizador: autorizadorFile.name,
      proteus: proteusFile.name,
    },
    ip: getClientIp(req),
  });

  // 9. Return 201
  return NextResponse.json({ id: faturamento.id }, { status: 201 });
}
