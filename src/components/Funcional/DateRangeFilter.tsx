"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface Props {
  from?: string;
  to?: string;
}

export default function DateRangeFilter({ from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [start, setStart] = useState(from ?? "");
  const [end, setEnd] = useState(to ?? "");

  function apply() {
    const p = new URLSearchParams();
    if (start) p.set("from", start);
    if (end) p.set("to", end);
    router.push(`${pathname}?${p.toString()}`);
  }

  function clear() {
    setStart("");
    setEnd("");
    router.push(pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">De</label>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a3a5c] bg-white dark:bg-[#0a1220] text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Até</label>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a3a5c] bg-white dark:bg-[#0a1220] text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
      </div>
      <button
        onClick={apply}
        className="px-4 py-2 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition"
      >
        Filtrar
      </button>
      {(from || to) && (
        <button
          onClick={clear}
          className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-[#2a3a5c] rounded-lg transition"
        >
          Limpar
        </button>
      )}
    </div>
  );
}
