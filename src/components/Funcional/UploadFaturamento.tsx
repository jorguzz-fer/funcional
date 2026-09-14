"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type FileSlot = "autorizador" | "proteus";

interface FileState {
  autorizador: File | null;
  proteus: File | null;
}

interface Props {
  /**
   * "novo" (default): cria um faturamento (POST /api/faturamento).
   * "reprocessar": substitui as planilhas de um faturamento existente,
   * mantendo o registro (POST /api/faturamento/[id]/reprocessar).
   */
  modo?: "novo" | "reprocessar";
  faturamentoId?: string;
  /** Período pré-preenchido (YYYY-MM-DD), usado no modo reprocessar. */
  periodoInicial?: { dataInicio: string; dataFim: string };
  /** Números do processamento atual, exibidos no aviso de substituição. */
  resumoAtual?: { pedidos: number; divergenciasResolvidas: number };
}

function defaultDataInicio(): string {
  const d = new Date();
  d.setDate(15);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

function defaultDataFim(): string {
  const d = new Date();
  d.setDate(0); // last day of previous month
  return d.toISOString().slice(0, 10);
}

export default function UploadFaturamento({
  modo = "novo",
  faturamentoId,
  periodoInicial,
  resumoAtual,
}: Props) {
  const router = useRouter();
  const reprocessar = modo === "reprocessar";

  const [files, setFiles] = useState<FileState>({ autorizador: null, proteus: null });
  const [dataInicio, setDataInicio] = useState(periodoInicial?.dataInicio ?? defaultDataInicio());
  const [dataFim, setDataFim] = useState(periodoInicial?.dataFim ?? defaultDataFim());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Faturamento já existente para o período informado (resposta 409 da API)
  const [conflito, setConflito] = useState<{ id: string } | null>(null);
  const autRef = useRef<HTMLInputElement>(null);
  const proRef = useRef<HTMLInputElement>(null);

  function handleFileChange(slot: FileSlot, file: File | null) {
    setFiles((prev) => ({ ...prev, [slot]: file }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files.autorizador || !files.proteus) {
      setError("Ambas as planilhas são obrigatórias.");
      return;
    }
    if (!dataInicio || !dataFim) {
      setError("Período de referência é obrigatório.");
      return;
    }
    if (dataInicio > dataFim) {
      setError("A data de início deve ser anterior à data de fechamento.");
      return;
    }
    setError("");
    setConflito(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("autorizador", files.autorizador);
      formData.append("proteus", files.proteus);
      formData.append("dataInicio", dataInicio);
      formData.append("dataFim", dataFim);

      const endpoint = reprocessar
        ? `/api/faturamento/${faturamentoId}/reprocessar`
        : "/api/faturamento";

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body: { error?: string; existingId?: string } = await res.json().catch(() => ({}));
        setError(body.error ?? "Erro ao processar o upload.");
        if (res.status === 409 && body.existingId) {
          setConflito({ id: body.existingId });
        }
        return;
      }

      const { id } = await res.json();
      router.push(`/faturamento/${id}`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            <p>{error}</p>
            {conflito && (
              <div className="flex flex-wrap gap-2 mt-3">
                <Link
                  href={`/faturamento/${conflito.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  Abrir faturamento existente
                </Link>
                {!reprocessar && (
                  <Link
                    href={`/faturamento/${conflito.id}/reprocessar`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
                  >
                    <span className="material-symbols-outlined text-sm">sync</span>
                    Substituir as planilhas do existente
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Aviso de substituição (modo reprocessar) */}
        {reprocessar && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl flex-shrink-0 mt-0.5">
              warning
            </span>
            <div className="text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                Os dados atuais deste faturamento serão substituídos
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Pedidos{resumoAtual ? ` (${resumoAtual.pedidos})` : ""}, ordens de pagamento, conciliações e divergências
                {resumoAtual && resumoAtual.divergenciasResolvidas > 0
                  ? ` — inclusive as ${resumoAtual.divergenciasResolvidas} já resolvida${resumoAtual.divergenciasResolvidas !== 1 ? "s" : ""} —`
                  : ""}{" "}
                serão descartados e recalculados a partir das novas planilhas. O histórico de auditoria é mantido.
              </p>
            </div>
          </div>
        )}

        {/* Período */}
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-6 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Período de Referência
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Data de Início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-[#2a3a5c] bg-white dark:bg-[#0a0e19] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Data de Fechamento
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-[#2a3a5c] bg-white dark:bg-[#0a0e19] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          {dataInicio && dataFim && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Somente infusões realizadas entre{" "}
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {new Date(dataInicio + "T12:00:00").toLocaleDateString("pt-BR")}
              </span>{" "}
              e{" "}
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {new Date(dataFim + "T12:00:00").toLocaleDateString("pt-BR")}
              </span>{" "}
              serão incluídas.
            </p>
          )}
        </div>

        {/* Upload Autorizador */}
        <DropZone
          label="Planilha do Autorizador"
          description="Arquivo pedidos*.xlsx — extraído do sistema Autorizador"
          file={files.autorizador}
          inputRef={autRef}
          onChange={(f) => handleFileChange("autorizador", f)}
          icon="clinical_notes"
        />

        {/* Upload Proteus */}
        <DropZone
          label="Planilha do Proteus"
          description="Arquivo enviado pela Talita (financeiro) — fechamento*.xlsx"
          file={files.proteus}
          inputRef={proRef}
          onChange={(f) => handleFileChange("proteus", f)}
          icon="account_balance"
        />

        <button
          type="submit"
          disabled={loading || !files.autorizador || !files.proteus}
          className="w-full py-3 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              Processando planilhas...
            </>
          ) : reprocessar ? (
            <>
              <span className="material-symbols-outlined text-lg">sync</span>
              Substituir planilhas e reconciliar
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">play_arrow</span>
              Iniciar Conciliação
            </>
          )}
        </button>
      </form>
    </div>
  );
}

interface DropZoneProps {
  label: string;
  description: string;
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (file: File | null) => void;
  icon: string;
}

function DropZone({ label, description, file, inputRef, onChange, icon }: DropZoneProps) {
  return (
    <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-6 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary-500 text-xl">{icon}</span>
        {label}
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{description}</p>

      {file ? (
        <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/40">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
            <span className="text-sm text-green-700 dark:text-green-400 font-medium truncate max-w-xs">
              {file.name}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-gray-400 hover:text-red-500 transition"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 dark:border-[#2a3a5c] rounded-xl p-6 text-center hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition"
        >
          <span className="material-symbols-outlined text-gray-400 text-3xl block mb-2">upload_file</span>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Clique para selecionar o arquivo <span className="font-medium text-primary-500">.xlsx</span>
          </p>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
