"use client";

import React from "react";
import Link from "next/link";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

interface FaturamentoAtual {
  id: string;
  status: string;
  _count: { pedidos: number; divergencias: number };
}

interface Props {
  totalFaturamentos: number;
  faturamentoAtual: FaturamentoAtual | null;
  totalDivergenciasPendentes: number;
  mes: number;
  ano: number;
}

export default function DashboardKPIs({
  totalFaturamentos,
  faturamentoAtual,
  totalDivergenciasPendentes,
  mes,
  ano,
}: Props) {
  const mesNome = MESES[mes - 1];

  const statusColor: Record<string, string> = {
    RASCUNHO:    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    EM_REVISAO:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    CONCILIADO:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    EXPORTADO:   "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    CONCLUIDO:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };

  const statusLabel: Record<string, string> = {
    RASCUNHO:   "Rascunho",
    EM_REVISAO: "Em Revisão",
    CONCILIADO: "Conciliado",
    EXPORTADO:  "Exportado",
    CONCLUIDO:  "Concluído",
  };

  return (
    <div className="p-[25px]">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Faturamento J&amp;J — {mesNome} {ano}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[25px] mb-[25px]">
        {/* Faturamento atual */}
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-6 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary-600 dark:text-primary-400 text-xl">
                receipt_long
              </span>
            </div>
            {faturamentoAtual && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[faturamentoAtual.status] ?? ""}`}>
                {statusLabel[faturamentoAtual.status] ?? faturamentoAtual.status}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Faturamento {mesNome}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {faturamentoAtual ? `${faturamentoAtual._count.pedidos} pedidos` : "—"}
          </p>
          {faturamentoAtual ? (
            <Link
              href={`/faturamento/${faturamentoAtual.id}`}
              className="text-xs text-primary-500 hover:underline mt-2 inline-block"
            >
              Ver detalhes →
            </Link>
          ) : (
            <Link
              href="/faturamento/novo"
              className="text-xs text-primary-500 hover:underline mt-2 inline-block"
            >
              Iniciar faturamento →
            </Link>
          )}
        </div>

        {/* Divergências pendentes */}
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-6 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-xl">
                warning
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Divergências Pendentes</p>
          <p className={`text-2xl font-bold mt-1 ${
            totalDivergenciasPendentes > 0
              ? "text-red-600 dark:text-red-400"
              : "text-green-600 dark:text-green-400"
          }`}>
            {totalDivergenciasPendentes}
          </p>
          {totalDivergenciasPendentes > 0 && faturamentoAtual && (
            <Link
              href={`/faturamento/${faturamentoAtual.id}/divergencias`}
              className="text-xs text-red-500 hover:underline mt-2 inline-block"
            >
              Resolver divergências →
            </Link>
          )}
        </div>

        {/* Pedidos sem finalização */}
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-6 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl">
                schedule
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Vouchers Não Finalizados</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {faturamentoAtual?._count.divergencias ?? 0}
          </p>
          <p className="text-xs text-gray-400 mt-2">Requerem atenção</p>
        </div>

        {/* Total histórico */}
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-6 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-xl">
                history
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Fechamentos Históricos</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {totalFaturamentos}
          </p>
          <Link
            href="/faturamento"
            className="text-xs text-primary-500 hover:underline mt-2 inline-block"
          >
            Ver histórico →
          </Link>
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="bg-white dark:bg-[#0d1526] rounded-2xl p-6 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/faturamento/novo"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-[#2a3a5c] hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition group"
          >
            <span className="material-symbols-outlined text-primary-500 text-xl">upload_file</span>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">Novo Faturamento</p>
              <p className="text-xs text-gray-500">Subir planilhas</p>
            </div>
          </Link>

          <Link
            href="/analises"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-[#2a3a5c] hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition"
          >
            <span className="material-symbols-outlined text-primary-500 text-xl">bar_chart</span>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">Análises</p>
              <p className="text-xs text-gray-500">Por clínica e medicamento</p>
            </div>
          </Link>

          <Link
            href="/clinicas"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-[#2a3a5c] hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition"
          >
            <span className="material-symbols-outlined text-primary-500 text-xl">local_hospital</span>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">Clínicas</p>
              <p className="text-xs text-gray-500">Credenciadas</p>
            </div>
          </Link>

          <Link
            href="/configuracoes"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-[#2a3a5c] hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition"
          >
            <span className="material-symbols-outlined text-primary-500 text-xl">settings</span>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">Configurações</p>
              <p className="text-xs text-gray-500">Usuários e regras</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Aging card */}
      <div className="mt-[25px] bg-white dark:bg-[#0d1526] rounded-2xl p-6 border border-gray-100 dark:border-[#1e2d47] shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Aging de Pedidos — Prazo de Faturamento
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/40">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">—</p>
            <p className="text-xs text-gray-500 mt-1">até 30 dias</p>
            <p className="text-xs font-medium text-green-600 dark:text-green-400">OK</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/40">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">—</p>
            <p className="text-xs text-gray-500 mt-1">31–60 dias</p>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Atenção</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/40">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">—</p>
            <p className="text-xs text-gray-500 mt-1">61–90 dias</p>
            <p className="text-xs font-medium text-red-600 dark:text-red-400">Urgente</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Dados carregados após o primeiro upload do faturamento do mês
        </p>
      </div>
    </div>
  );
}
