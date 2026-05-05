"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  faturamentoId: string;
}

export default function ProcessingBanner({ faturamentoId }: Props) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [router, faturamentoId]);

  return (
    <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl animate-spin flex-shrink-0">
        refresh
      </span>
      <div>
        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
          Planilhas sendo processadas...
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
          A página será atualizada automaticamente quando o processamento terminar.
        </p>
      </div>
    </div>
  );
}
