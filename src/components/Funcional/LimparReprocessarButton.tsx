"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  periodo: string;
}

export default function LimparReprocessarButton({ id, periodo }: Props) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/faturamento/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Erro ao deletar. Tente novamente.");
        return;
      }
      // Dados deletados → vai direto para o upload de novo faturamento
      router.push("/faturamento/novo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Botão que abre o modal */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition"
      >
        <span className="material-symbols-outlined text-lg">refresh</span>
        Limpar e Re-processar
      </button>

      {/* Modal de confirmação */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !loading && setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white dark:bg-[#0d1526] rounded-2xl shadow-xl border border-gray-100 dark:border-[#1e2d47] w-full max-w-md p-6">
            {/* Ícone */}
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">warning</span>
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Limpar e Re-processar?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Todos os dados do faturamento abaixo serão <strong className="text-red-600 dark:text-red-400">permanentemente deletados</strong>:
            </p>

            {/* Período destacado */}
            <div className="my-4 px-4 py-3 bg-gray-50 dark:bg-[#0a1220] rounded-xl border border-gray-200 dark:border-[#2a3a5c]">
              <p className="text-xs text-gray-400 mb-0.5">Faturamento</p>
              <p className="font-semibold text-gray-900 dark:text-white">{periodo}</p>
            </div>

            {/* O que será deletado */}
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-4">
              {["Pedidos (incluindo excluídos)", "Ordens de Pagamento", "Conciliações", "Divergências", "Arquivos de upload"].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-400 text-sm">remove_circle</span>
                  {item}
                </li>
              ))}
            </ul>

            <p className="text-xs text-gray-400 mb-5">
              Após a limpeza, você será redirecionado para subir novas planilhas.
            </p>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
            )}

            {/* Ações */}
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#2a3a5c] rounded-lg hover:bg-gray-50 dark:hover:bg-[#0f1c35] transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Deletando…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">delete_forever</span>
                    Confirmar Limpeza
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
