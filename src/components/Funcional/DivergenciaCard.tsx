"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const TIPO_LABEL: Record<string, string> = {
  LINHA_FALTANTE:          "Linha Faltante",
  VALOR_DIVERGENTE:        "Valor Divergente",
  NF_ABREVIADA:            "NF com Número Abreviado",
  CNPJ_DIFERENTE:          "CNPJ Divergente",
  RAZAO_SOCIAL_DIFERENTE:  "Razão Social Divergente",
  LOTE_AUSENTE:            "Lote Ausente",
  VOUCHER_SEM_FINALIZACAO: "Voucher Não Finalizado",
  OUTRO:                   "Outro",
};

const TIPO_COLOR: Record<string, string> = {
  LINHA_FALTANTE:          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  VALOR_DIVERGENTE:        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  NF_ABREVIADA:            "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  CNPJ_DIFERENTE:          "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  RAZAO_SOCIAL_DIFERENTE:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  LOTE_AUSENTE:            "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  VOUCHER_SEM_FINALIZACAO: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  OUTRO:                   "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

interface DivergenciaData {
  id: string;
  tipo: string;
  descricao: string;
  detalhe: Record<string, unknown> | null;
  valorAutorizador: number | null;
  valorProteus: number | null;
  resolvido: boolean;
  resolvidoPor: string | null;
  resolvidoEm: string | null;
  notasResolucao: string | null;
  createdAt: string;
}

interface Props {
  divergencia: DivergenciaData;
  faturamentoId: string;
}

export default function DivergenciaCard({ divergencia, faturamentoId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notas, setNotas] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [localResolvido, setLocalResolvido] = useState(divergencia.resolvido);
  const [localInfo, setLocalInfo] = useState<{ por: string; em: string; notas: string } | null>(
    divergencia.resolvido && divergencia.resolvidoPor
      ? {
          por: divergencia.resolvidoPor,
          em: divergencia.resolvidoEm ?? "",
          notas: divergencia.notasResolucao ?? "",
        }
      : null,
  );
  const [erro, setErro] = useState<string | null>(null);

  const handleResolver = () => {
    setErro(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/faturamento/${faturamentoId}/divergencias/${divergencia.id}/resolver`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notas: notas.trim() || undefined }),
          },
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErro((data as { error?: string }).error ?? "Erro ao resolver divergência");
          return;
        }

        setLocalResolvido(true);
        setLocalInfo({
          por: "Você",
          em: new Date().toISOString(),
          notas: notas.trim(),
        });
        setShowForm(false);
        router.refresh();
      } catch {
        setErro("Erro de conexão. Tente novamente.");
      }
    });
  };

  const fmtMoeda = (v: number | null) =>
    v == null
      ? "—"
      : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const fmtData = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`bg-white dark:bg-[#0d1526] rounded-2xl border shadow-sm transition ${
        localResolvido
          ? "border-green-200 dark:border-green-900/40"
          : "border-red-200 dark:border-red-900/40"
      }`}
    >
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          {/* Left: tipo + descricao */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TIPO_COLOR[divergencia.tipo] ?? "bg-gray-100 text-gray-600"}`}
              >
                {TIPO_LABEL[divergencia.tipo] ?? divergencia.tipo}
              </span>
              {localResolvido ? (
                <span className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Resolvido
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-sm">error</span>
                  Pendente
                </span>
              )}
              <span className="text-xs text-gray-400">
                #{divergencia.id.slice(-6).toUpperCase()}
              </span>
            </div>

            <p className="text-sm text-gray-800 dark:text-white font-medium leading-snug">
              {divergencia.descricao}
            </p>

            {/* Valores Autorizador vs Proteus */}
            {(divergencia.valorAutorizador != null || divergencia.valorProteus != null) && (
              <div className="mt-3 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Autorizador:</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {fmtMoeda(divergencia.valorAutorizador)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Proteus:</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {fmtMoeda(divergencia.valorProteus)}
                  </span>
                </div>
                {divergencia.valorAutorizador != null && divergencia.valorProteus != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Diferença:</span>
                    <span
                      className={`text-sm font-semibold ${
                        Math.abs(divergencia.valorAutorizador - divergencia.valorProteus) > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {fmtMoeda(divergencia.valorAutorizador - divergencia.valorProteus)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Extra detalhe */}
            {divergencia.detalhe && Object.keys(divergencia.detalhe).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {Object.entries(divergencia.detalhe).map(([k, v]) => (
                  <div key={k} className="text-xs">
                    <span className="text-gray-400 capitalize">{k}: </span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {String(v)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Resolucao info */}
            {localResolvido && localInfo && (
              <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30">
                <p className="text-xs text-green-800 dark:text-green-300">
                  <span className="font-medium">Resolvido por {localInfo.por}</span>
                  {" · "}
                  {fmtData(localInfo.em)}
                </p>
                {localInfo.notas && (
                  <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                    Notas: {localInfo.notas}
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-2">
              Detectado em {fmtData(divergencia.createdAt)}
            </p>
          </div>

          {/* Right: action */}
          {!localResolvido && (
            <div className="flex-shrink-0">
              <button
                onClick={() => setShowForm((f) => !f)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition"
              >
                <span className="material-symbols-outlined text-base">task_alt</span>
                Marcar como Resolvido
              </button>
            </div>
          )}
        </div>

        {/* Resolution form */}
        {showForm && !localResolvido && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#1e2d47]">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Notas de resolução (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Descreva como a divergência foi resolvida..."
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a3a5c] bg-white dark:bg-[#0a1220] text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
            />
            {erro && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{erro}</p>
            )}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleResolver}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition"
              >
                {isPending ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">check</span>
                    Confirmar Resolução
                  </>
                )}
              </button>
              <button
                onClick={() => { setShowForm(false); setErro(null); }}
                disabled={isPending}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#2a3a5c] rounded-lg hover:bg-gray-50 dark:hover:bg-[#0f1c35] transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
