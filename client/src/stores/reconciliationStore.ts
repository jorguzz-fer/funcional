import { create } from "zustand";
import api from "../services/api";
import type { ReconciliationResult, ReconciliationSummary, Pagination } from "../types";

interface ReconciliationState {
  results: ReconciliationResult[];
  summary: ReconciliationSummary | null;
  pagination: Pagination | null;
  isRunning: boolean;
  isLoading: boolean;
  error: string | null;
  activeTab: string;

  runReconciliation: (batchId: string) => Promise<void>;
  fetchResults: (batchId: string, status?: string, page?: number) => Promise<void>;
  fetchSummary: (batchId: string) => Promise<void>;
  resolveItem: (id: string, observacao: string) => Promise<void>;
  setActiveTab: (tab: string) => void;
}

export const useReconciliationStore = create<ReconciliationState>((set) => ({
  results: [],
  summary: null,
  pagination: null,
  isRunning: false,
  isLoading: false,
  error: null,
  activeTab: "todos",

  runReconciliation: async (batchId) => {
    set({ isRunning: true, error: null });
    try {
      await api.post(`/reconciliation/${batchId}/run`);
      set({ isRunning: false });
    } catch {
      set({ isRunning: false, error: "Erro ao executar conciliação" });
    }
  },

  fetchResults: async (batchId, status = "todos", page = 1) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/reconciliation/${batchId}/results`, {
        params: { status, page, limit: 50 },
      });
      set({
        results: data.results,
        pagination: data.pagination,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false, error: "Erro ao carregar resultados" });
    }
  },

  fetchSummary: async (batchId) => {
    try {
      const { data } = await api.get(`/reconciliation/${batchId}/summary`);
      set({ summary: data });
    } catch {
      set({ error: "Erro ao carregar resumo" });
    }
  },

  resolveItem: async (id, observacao) => {
    try {
      await api.patch(`/reconciliation/${id}/resolve`, { observacao });
      set((state) => ({
        results: state.results.map((r) =>
          r.id === id
            ? { ...r, status: "resolvido", observacao, resolvedAt: new Date().toISOString() }
            : r
        ),
      }));
    } catch {
      set({ error: "Erro ao resolver item" });
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
}));
