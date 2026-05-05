"use client";

import { useState } from "react";

interface Props {
  faturamentoId: string;
  tipo: "funcional" | "proteus";
  label: string;
}

export default function ExportButtons({ faturamentoId, tipo, label }: Props) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(
        `/api/faturamento/${faturamentoId}/export?tipo=${tipo}`,
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro((data as { error?: string }).error ?? "Erro ao gerar exportação");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `faturamento_${tipo}_${faturamentoId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition"
      >
        {loading ? (
          <>
            <span className="material-symbols-outlined text-base animate-spin">refresh</span>
            Gerando arquivo...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-base">download</span>
            {label}
          </>
        )}
      </button>
      {erro && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{erro}</p>
      )}
    </div>
  );
}
