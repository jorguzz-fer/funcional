/**
 * Regras compartilhadas de upload/processamento de planilhas de faturamento,
 * usadas tanto pela criação (POST /api/faturamento) quanto pelo
 * reprocessamento em lugar (POST /api/faturamento/[id]/reprocessar).
 */
import { NextResponse } from "next/server";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { processarFaturamento } from "@/lib/pipeline/processarFaturamento";

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
export const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

/**
 * Janela após a qual um faturamento parado em RASCUNHO/EM_REVISAO sem erro
 * registrado é considerado "processamento abandonado" (ex.: container
 * reiniciado no meio do pipeline) e volta a aceitar reprocessamento.
 */
const PROCESSAMENTO_STALE_MS = 30 * 60 * 1000;

export function getExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length < 2) return "";
  return "." + parts[parts.length - 1].toLowerCase();
}

export function isAllowedExtension(filename: string): boolean {
  return ALLOWED_EXTENSIONS.includes(getExtension(filename));
}

/** YYYY-MM-DD (de <input type="date">) → meio-dia UTC, evitando deriva de fuso. */
export function parseLocalDate(dateStr: string): Date | null {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
  return isNaN(d.getTime()) ? null : d;
}

export interface UploadValidado {
  autorizadorFile: File;
  proteusFile: File;
  dataInicio: Date;
  dataFechamento: Date;
}

/**
 * Valida os campos do multipart (duas planilhas + período).
 * Devolve a resposta de erro pronta ou os dados validados.
 */
export function validarUploadFaturamento(
  formData: FormData,
): { error: NextResponse; dados?: undefined } | { error?: undefined; dados: UploadValidado } {
  const bad = (msg: string) => ({ error: NextResponse.json({ error: msg }, { status: 400 }) });

  const autorizadorFile = formData.get("autorizador");
  const proteusFile = formData.get("proteus");
  const dataInicioStr = formData.get("dataInicio");
  const dataFimStr = formData.get("dataFim");

  if (!autorizadorFile || !(autorizadorFile instanceof File)) {
    return bad("Campo 'autorizador' é obrigatório");
  }
  if (!proteusFile || !(proteusFile instanceof File)) {
    return bad("Campo 'proteus' é obrigatório");
  }
  if (!dataInicioStr || !dataFimStr) {
    return bad("Campos 'dataInicio' e 'dataFim' são obrigatórios");
  }

  const dataInicio = parseLocalDate(String(dataInicioStr));
  const dataFechamento = parseLocalDate(String(dataFimStr));

  if (!dataInicio) return bad("Data de início inválida");
  if (!dataFechamento) return bad("Data de fechamento inválida");
  if (dataInicio > dataFechamento) {
    return bad("A data de início deve ser anterior à data de fechamento");
  }

  if (!isAllowedExtension(autorizadorFile.name)) {
    return bad(`Arquivo autorizador com extensão inválida. Permitido: ${ALLOWED_EXTENSIONS.join(", ")}`);
  }
  if (!isAllowedExtension(proteusFile.name)) {
    return bad(`Arquivo proteus com extensão inválida. Permitido: ${ALLOWED_EXTENSIONS.join(", ")}`);
  }

  if (autorizadorFile.size > MAX_FILE_SIZE) {
    return bad("Arquivo autorizador excede o limite de 50MB");
  }
  if (proteusFile.size > MAX_FILE_SIZE) {
    return bad("Arquivo proteus excede o limite de 50MB");
  }

  return { dados: { autorizadorFile, proteusFile, dataInicio, dataFechamento } };
}

export interface ArquivoLido {
  file: File;
  buffer: Buffer;
  caminho: string;
}

export interface ArquivosLidos {
  uploadDir: string;
  autorizador: ArquivoLido;
  proteus: ArquivoLido;
}

/**
 * Lê as duas planilhas para memória e grava um backup temporário em
 * /tmp/uploads/<uuid>/ (best-effort — o pipeline NÃO lê do disco; o backup
 * é expurgado ao fim do processamento por `dispararPipeline`).
 *
 * Lança se a leitura dos arquivos falhar.
 */
export async function lerArquivosUpload(
  autorizadorFile: File,
  proteusFile: File,
): Promise<ArquivosLidos> {
  // /tmp is always writable in Docker containers, unlike /app which may be read-only.
  const uploadDir = join("/tmp", "uploads", randomUUID());

  const autorizadorPath = join(uploadDir, `autorizador${getExtension(autorizadorFile.name)}`);
  const proteusPath = join(uploadDir, `proteus${getExtension(proteusFile.name)}`);

  const [autorizadorArrayBuffer, proteusArrayBuffer] = await Promise.all([
    autorizadorFile.arrayBuffer(),
    proteusFile.arrayBuffer(),
  ]);
  const autorizadorBuf = Buffer.from(autorizadorArrayBuffer);
  const proteusBuf = Buffer.from(proteusArrayBuffer);

  try {
    await mkdir(uploadDir, { recursive: true });
    await Promise.all([writeFile(autorizadorPath, autorizadorBuf), writeFile(proteusPath, proteusBuf)]);
  } catch {
    // Disk write failure is non-fatal: pipeline uses in-memory buffers.
    console.warn(`[upload] Backup em disco falhou para uploadDir=${uploadDir}`);
  }

  return {
    uploadDir,
    autorizador: { file: autorizadorFile, buffer: autorizadorBuf, caminho: autorizadorPath },
    proteus: { file: proteusFile, buffer: proteusBuf, caminho: proteusPath },
  };
}

/** Registros UploadArquivo (um por planilha) a criar para o faturamento. */
export function registrosUpload(
  faturamentoId: string,
  arquivos: ArquivosLidos,
): Prisma.UploadArquivoCreateManyInput[] {
  return [
    {
      faturamentoId,
      tipo: "AUTORIZADOR",
      nomeOriginal: arquivos.autorizador.file.name,
      caminho: arquivos.autorizador.caminho,
      tamanhoBytes: arquivos.autorizador.file.size,
      processado: false,
    },
    {
      faturamentoId,
      tipo: "PROTEUS",
      nomeOriginal: arquivos.proteus.file.name,
      caminho: arquivos.proteus.caminho,
      tamanhoBytes: arquivos.proteus.file.size,
      processado: false,
    },
  ];
}

/**
 * Dispara o pipeline em segundo plano (fire-and-forget) com os buffers em
 * memória. Ao terminar — com ou sem erro — expurga as planilhas originais
 * do disco: elas contêm dados de faturamento e não são necessárias depois
 * (o reprocessamento exige novo upload).
 */
export function dispararPipeline(faturamentoId: string, arquivos: ArquivosLidos): void {
  processarFaturamento(faturamentoId, {
    autorizador: arquivos.autorizador.buffer,
    proteus: arquivos.proteus.buffer,
  })
    .catch((err) => {
      console.error(`[api/faturamento] Erro no pipeline para ${faturamentoId}:`, err);
    })
    .finally(async () => {
      try {
        await rm(arquivos.uploadDir, { recursive: true, force: true });
      } catch (err) {
        console.warn(`[api/faturamento] Falha ao expurgar ${arquivos.uploadDir}:`, err);
      }
    });
}

interface EstadoProcessamento {
  status: string;
  updatedAt: Date;
  uploads: { erros: Prisma.JsonValue | null }[];
}

/**
 * Indica se o pipeline ainda pode estar rodando para este faturamento.
 * Enquanto isso for verdade, reprocessar/excluir causaria dados misturados.
 *
 * RASCUNHO/EM_REVISAO com erro registrado nos uploads = falhou (liberado).
 * Sem erro e atualizado há mais de PROCESSAMENTO_STALE_MS = abandonado (liberado).
 */
export function processamentoEmAndamento(f: EstadoProcessamento): boolean {
  if (f.status !== "RASCUNHO" && f.status !== "EM_REVISAO") return false;
  if (f.uploads.some((u) => u.erros != null)) return false;
  return Date.now() - f.updatedAt.getTime() < PROCESSAMENTO_STALE_MS;
}
