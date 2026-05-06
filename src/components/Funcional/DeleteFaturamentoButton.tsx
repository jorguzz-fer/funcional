"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  periodo: string;
}

export default function DeleteFaturamentoButton({ id, periodo }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/faturamento/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "Erro ao deletar.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Confirmar?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs font-semibold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
        >
          {loading ? "..." : "Sim"}
        </button>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Não
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={`Deletar faturamento ${periodo}`}
      className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition ml-3"
    >
      <span className="material-symbols-outlined text-lg">delete</span>
    </button>
  );
}
