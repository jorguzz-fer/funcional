"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type FileSlot = "autorizador" | "proteus";

interface FileState {
  autorizador: File | null;
  proteus: File | null;
}

export default function UploadFaturamento() {
  const router = useRouter();
  const [files, setFiles] = useState<FileState>({ autorizador: null, proteus: null });
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("autorizador", files.autorizador);
      formData.append("proteus", files.proteus);
      formData.append("mes", String(mes));
      formData.append("ano", String(ano));

      const res = await fetch("/api/faturamento", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Erro ao processar o upload.");
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
            {error}
          </div>
        )}

        {/* Mês/Ano */}
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-6 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Período de Referência
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Mês
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-[#2a3a5c] bg-white dark:bg-[#0a0e19] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"].map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Ano
              </label>
              <input
                type="number"
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                min={2023}
                max={2030}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-[#2a3a5c] bg-white dark:bg-[#0a0e19] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
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
